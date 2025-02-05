import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import addAdditionalFormats from 'ajv-formats-draft2019';
import type { ErrorObject, Options } from 'ajv';
import type { JSONSchema7 } from 'json-schema';

import { getCurrentDataTypeForApplication } from 'src/features/applicationMetadata/appMetadataUtils';
import {
  getRootElementPath,
  getSchemaPart,
  getSchemaPartOldGenerator,
  processInstancePath,
} from 'src/utils/schemaUtils';
import type {
  ISchemaValidationError,
  ISchemaValidator,
  ISchemaValidators,
  ValidationDataSources,
} from 'src/features/validation';
import type { IDataType } from 'src/types/shared';

const validators: ISchemaValidators = {};

export function getValidator(typeId: string, schema: JSONSchema7, dataType: IDataType) {
  if (!validators[typeId]) {
    validators[typeId] = createValidator(schema, dataType);
  }
  return validators[typeId];
}

export function createValidator(schema: any, dataType: IDataType): ISchemaValidator {
  const ajvOptions: Options = {
    allErrors: true,
    coerceTypes: true,

    /**
     * This option is deprecated in AJV, but continues to work for now. We have unit tests that will fail if the
     * functionality is removed from AJV. The jsPropertySyntax (ex. 'Path.To.Array[0].Item') was replaced with JSON
     * pointers in v7 (ex. '/Path/To/Array/0/Item'). If the option to keep the old syntax is removed at some point,
     * we'll have to implement a translator ourselves, as we'll need this format to equal our data model bindings.
     *
     * @see https://github.com/ajv-validator/ajv/issues/1577#issuecomment-832216719
     */
    jsPropertySyntax: true,

    strict: false,
    strictTypes: false,
    strictTuples: false,
    unicodeRegExp: false,
    code: { es5: true },
  };

  const ajv = schema.$schema?.includes('2020-12') ? new Ajv2020(ajvOptions) : new Ajv(ajvOptions);
  addFormats(ajv);
  addAdditionalFormats(ajv);
  ajv.addFormat('year', /^\d{4}$/);
  ajv.addFormat('year-month', /^\d{4}-(0[1-9]|1[0-2])$/);
  ajv.addSchema(schema, 'schema');

  return {
    validator: ajv,
    rootElementPath: getRootElementPath(schema, dataType),
  };
}

/**
 * Check if AVJ validation error is a oneOf error ("must match exactly one schema in oneOf").
 * We don't currently support oneOf validation.
 * These can be ignored, as there will be other, specific validation errors that actually
 * from the specified sub-schemas that will trigger validation errors where relevant.
 * @param error the AJV validation error object
 * @returns a value indicating if the provided error is a "oneOf" error.
 */
export const isOneOfError = (error: ErrorObject): boolean => error.keyword === 'oneOf' || error.params?.type === 'null';

/**
 * A mapping between the json schema validation error keywords and the language keys used for the standard validation.
 */
export const errorMessageKeys = {
  minimum: {
    textKey: 'min',
    paramKey: 'limit',
  },
  exclusiveMinimum: {
    textKey: 'min',
    paramKey: 'limit',
  },
  maximum: {
    textKey: 'max',
    paramKey: 'limit',
  },
  exclusiveMaximum: {
    textKey: 'max',
    paramKey: 'limit',
  },
  minLength: {
    textKey: 'minLength',
    paramKey: 'limit',
  },
  maxLength: {
    textKey: 'maxLength',
    paramKey: 'limit',
  },
  pattern: {
    textKey: 'pattern',
    paramKey: 'pattern',
  },
  format: {
    textKey: 'pattern',
    paramKey: 'format',
  },
  type: {
    textKey: 'pattern',
    paramKey: 'type',
  },
  required: {
    textKey: 'required',
    paramKey: 'limit',
  },
  enum: {
    textKey: 'enum',
    paramKey: 'allowedValues',
  },
  const: {
    textKey: 'enum',
    paramKey: 'allowedValues',
  },
  multipleOf: {
    textKey: 'multipleOf',
    paramKey: 'multipleOf',
  },
  oneOf: {
    textKey: 'oneOf',
    paramKey: 'passingSchemas',
  },
  anyOf: {
    textKey: 'anyOf',
    paramKey: 'passingSchemas',
  },
  allOf: {
    textKey: 'allOf',
    paramKey: 'passingSchemas',
  },
  not: {
    textKey: 'not',
    paramKey: 'passingSchemas',
  },
  formatMaximum: {
    textKey: 'formatMaximum',
    paramKey: 'limit',
  },
  formatMinimum: {
    textKey: 'formatMinimum',
    paramKey: 'limit',
  },
  formatExclusiveMaximum: {
    textKey: 'formatMaximum',
    paramKey: 'limit',
  },
  formatExclusiveMinimum: {
    textKey: 'formatMinimum',
    paramKey: 'limit',
  },
  minItems: {
    textKey: 'minItems',
    paramKey: 'limit',
  },
  maxItems: {
    textKey: 'maxItems',
    paramKey: 'limit',
  },
};

/**
 * Validates the form data against the schema and returns a list of schema validation errors.
 * @see ISchemaValidationError
 */
export function getSchemaValidationErrors({
  formData,
  application,
  process,
  layoutSets,
  schema,
}: ValidationDataSources): ISchemaValidationError[] {
  const currentDataTaskDataTypeId = getCurrentDataTypeForApplication({
    application,
    process,
    layoutSets,
  });
  const dataType = application?.dataTypes.find((d) => d.id === currentDataTaskDataTypeId);
  if (!currentDataTaskDataTypeId || !dataType) {
    return [];
  }

  const { validator, rootElementPath } = getValidator(currentDataTaskDataTypeId, schema, dataType);
  const valid = validator.validate(`schema${rootElementPath}`, structuredClone(formData));

  if (valid) {
    return [];
  }
  const validationErrors: ISchemaValidationError[] = [];

  for (const error of validator.errors || []) {
    // Required fields are handled separately
    if (error.keyword === 'required') {
      continue;
    }

    if (isOneOfError(error)) {
      continue;
    }
    const invalidDataType = error.keyword === 'type' || error.keyword === 'format';

    let errorParams = error.params[errorMessageKeys[error.keyword]?.paramKey];
    if (errorParams === undefined) {
      console.warn(`WARN: Error message for ${error.keyword} not implemented`);
    }
    if (Array.isArray(errorParams)) {
      errorParams = errorParams.join(', ');
    }

    // backward compatible if we are validating against a sub scheme.
    const fieldSchema = rootElementPath
      ? getSchemaPartOldGenerator(error.schemaPath, schema, rootElementPath)
      : getSchemaPart(error.schemaPath, schema);

    const errorMessage = fieldSchema?.errorMessage
      ? { key: fieldSchema.errorMessage }
      : {
          key: `validation_errors.${errorMessageKeys[error.keyword]?.textKey || error.keyword}`,
          params: [errorParams],
        };

    const field = processInstancePath(error.instancePath);
    validationErrors.push({ message: errorMessage, bindingField: field, invalidDataType, keyword: error.keyword });
  }

  return validationErrors;
}
