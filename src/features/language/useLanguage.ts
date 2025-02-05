import { Children, isValidElement, useMemo } from 'react';
import type { JSX, ReactNode } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { useLaxApplicationSettings } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { DataModelReaders, useDataModelReaders } from 'src/features/formData/FormDataReaders';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useTextResources } from 'src/features/language/textResources/TextResourcesProvider';
import { getLanguageFromCode } from 'src/language/languages';
import { getParsedLanguageFromText } from 'src/language/sharedLanguage';
import { useFormComponentCtx } from 'src/layout/FormComponentContext';
import { getKeyWithoutIndexIndicators } from 'src/utils/databindings';
import { transposeDataBinding } from 'src/utils/databindings/DataBinding';
import { smartLowerCaseFirst } from 'src/utils/formComponentUtils';
import { buildInstanceDataSources } from 'src/utils/instanceDataSources';
import type { TextResourceMap } from 'src/features/language/textResources';
import type { FixedLanguageList } from 'src/language/languages';
import type { IApplicationSettings, IInstanceDataSources, ILanguage, IVariable } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type SimpleLangParam = string | number | undefined;
export type ValidLangParam = SimpleLangParam | ReactNode | TextReference;
export type TextReference = {
  key: ValidLanguageKey | string | undefined;
  params?: ValidLangParam[];
  makeLowerCase?: boolean;
};

export interface IUseLanguage {
  language: ILanguage;
  lang(
    key: ValidLanguageKey | string | undefined,
    params?: ValidLangParam[],
  ): string | JSX.Element | JSX.Element[] | null;
  langAsString(key: ValidLanguageKey | string | undefined, params?: ValidLangParam[], makeLowerCase?: boolean): string;
  langAsStringUsingPathInDataModel(
    key: ValidLanguageKey | string | undefined,
    dataModelPath: string,
    params?: ValidLangParam[],
  ): string;
  langAsNonProcessedString(key: ValidLanguageKey | string | undefined, params?: ValidLangParam[]): string;
  langAsNonProcessedStringUsingPathInDataModel(
    key: ValidLanguageKey | string | undefined,
    dataModelPath: string,
    params?: ValidLangParam[],
  ): string;
  elementAsString(element: ReactNode): string;
}

interface TextResourceVariablesDataSources {
  node: LayoutNode | undefined;
  applicationSettings: IApplicationSettings | null;
  instanceDataSources: IInstanceDataSources | null;
  dataModelPath?: string;
  dataModels: ReturnType<typeof useDataModelReaders>;
}

/**
 * This type converts the language object into a dot notation union of valid language keys.
 * Using this type helps us get suggestions for valid language keys in useLanguage() functions.
 * Thanks to ChatGPT for refinements to make this work!
 */
type ObjectToDotNotation<T extends Record<string, any>, Prefix extends string = ''> = {
  [K in keyof T]: K extends string
    ? T[K] extends string | number | boolean | null | undefined
      ? `${Prefix}${K}`
      : K extends string
        ? ObjectToDotNotation<T[K], `${Prefix}${K}.`>
        : never
    : never;
}[keyof T];

export type ValidLanguageKey = ObjectToDotNotation<FixedLanguageList>;

const emptyObject = {};

/**
 * Hook to resolve a key to a language string or React element (if the key is found and contains markdown or HTML).
 * Prefer this over using the long-named language functions. When those are less used, we can refactor their
 * functionality into this hook and remove them.
 *
 * You get two functions from this hook, and you can choose which one to use based on your needs:
 * - lang(key, params) usually returns a React element
 */
export function useLanguage(node?: LayoutNode) {
  const textResources = useTextResources();
  const selectedAppLanguage = useCurrentLanguage();
  const componentCtx = useFormComponentCtx();
  const nearestNode = node || componentCtx?.node;
  const dataModels = useDataModelReaders();
  const _applicationSettings = useLaxApplicationSettings();
  const applicationSettings = _applicationSettings === ContextNotProvided ? emptyObject : _applicationSettings;
  const instance = useLaxInstanceData();
  const instanceDataSources = useMemo(() => buildInstanceDataSources(instance), [instance]);

  const dataSources: TextResourceVariablesDataSources = useMemo(
    () => ({
      node: nearestNode,
      dataModels,
      applicationSettings,
      instanceDataSources,
    }),
    [nearestNode, dataModels, applicationSettings, instanceDataSources],
  );

  return useMemo(
    () => staticUseLanguage(textResources, null, selectedAppLanguage, dataSources),
    [selectedAppLanguage, textResources, dataSources],
  );
}

interface ILanguageState {
  textResources: TextResourceMap;
  language: ILanguage | null;
  selectedLanguage: string;
  dataSources: TextResourceVariablesDataSources;
}

/**
 * Static version, like the above and below functions, but with an API that lets you pass just the state you need.
 * This is useful for testing, but please do not use this in production code (where all arguments should be passed,
 * even if the signature is updated).
 */
export function staticUseLanguageForTests({
  textResources = {},
  language = null,
  selectedLanguage = 'nb',
  dataSources = {
    instanceDataSources: {
      instanceId: 'instanceId',
      appId: 'org/app',
      instanceOwnerPartyId: '12345',
      instanceOwnerPartyType: 'person',
    },
    dataModels: new DataModelReaders({}, 'default'),
    applicationSettings: {},
    node: undefined,
  },
}: Partial<ILanguageState> = {}) {
  return staticUseLanguage(textResources, language, selectedLanguage, dataSources);
}

function staticUseLanguage(
  textResources: TextResourceMap,
  _language: ILanguage | null,
  selectedLanguage: string,
  dataSources: TextResourceVariablesDataSources,
): IUseLanguage {
  const language = _language || getLanguageFromCode(selectedLanguage);

  function base(
    key: string | undefined,
    params?: ValidLangParam[],
    extendedSources?: Partial<TextResourceVariablesDataSources>,
    processing = true,
  ) {
    if (!key) {
      return '';
    }

    const textResource = getTextResourceByKey(key, textResources, { ...dataSources, ...extendedSources });
    if (textResource !== key) {
      // TODO(Validation): Use params if exists and only if no variables are specified (maybe add datasource params to variables definition)
      return processing ? getParsedLanguageFromText(textResource) : textResource;
    }

    const name = getLanguageFromKey(key, language);
    const out = params ? replaceParameters(name, simplifyParams(params, langAsString)) : name;

    return processing ? getParsedLanguageFromText(out) : out;
  }

  const lang: IUseLanguage['lang'] = (key, params) => base(key, params);

  const langAsString: IUseLanguage['langAsString'] = (key, params, makeLowerCase) => {
    const postProcess = makeLowerCase ? smartLowerCaseFirst : (str: string | undefined) => str;

    const result = lang(key, params);
    if (result === undefined || result === null) {
      return postProcess(key) || '';
    }

    return postProcess(getPlainTextFromNode(result, langAsString))!;
  };

  const langAsStringUsingPathInDataModel: IUseLanguage['langAsStringUsingPathInDataModel'] = (
    key,
    dataModelPath,
    params,
  ) => {
    const result = base(key, params, { dataModelPath });
    if (result === undefined || result === null) {
      return key || '';
    }

    return getPlainTextFromNode(result, langAsString);
  };

  const langAsNonProcessedString: IUseLanguage['langAsNonProcessedString'] = (key, params) =>
    base(key, params, undefined, false);

  const langAsNonProcessedStringUsingPathInDataModel: IUseLanguage['langAsNonProcessedStringUsingPathInDataModel'] = (
    key,
    dataModelPath,
    params,
  ) => base(key, params, { dataModelPath }, false);

  return {
    language,
    lang,
    langAsString,
    langAsStringUsingPathInDataModel,
    langAsNonProcessedString,
    langAsNonProcessedStringUsingPathInDataModel,
    elementAsString(element: ReactNode): string {
      return getPlainTextFromNode(element, langAsString);
    },
  };
}

const simplifyParams = (params: ValidLangParam[], langAsString: IUseLanguage['langAsString']): SimpleLangParam[] =>
  params.map((param) => {
    if (isTextReference(param)) {
      return langAsString(param.key, param.params, param.makeLowerCase);
    }
    if (isValidElement(param)) {
      return getPlainTextFromNode(param, langAsString);
    }

    return param as SimpleLangParam;
  });

const getPlainTextFromNode = (node: ReactNode, langAsString: IUseLanguage['langAsString']): string => {
  if (typeof node === 'string') {
    return node;
  }
  if (isValidElement(node)) {
    if (node.type === Lang) {
      return langAsString(node.props.id, node.props.params);
    }

    let text = '';
    Children.forEach(node.props.children, (child) => {
      text += getPlainTextFromNode(child, langAsString);
    });
    return text;
  }
  return '';
};

export function getLanguageFromKey(key: string, language: ILanguage) {
  const path = key.split('.');
  const value = getNestedObject(language, path);
  if (!value || typeof value === 'object') {
    return key;
  }
  return value;
}

function getTextResourceByKey(
  key: string,
  textResources: TextResourceMap,
  dataSources: TextResourceVariablesDataSources,
) {
  const textResource = textResources[key];
  if (!textResource) {
    return key;
  }

  const value = textResource.variables
    ? replaceVariables(textResource.value, textResource.variables, dataSources)
    : textResource.value;

  if (value === key) {
    // Prevents infinite loops when a text resource references itself
    return value;
  }

  // Always look up the text resource value recursively, in case it for example looks up a value in the data model
  // that just points to another text resource (a common pattern in for example the Likert component).
  return getTextResourceByKey(value, textResources, dataSources);
}

function replaceVariables(text: string, variables: IVariable[], dataSources: TextResourceVariablesDataSources) {
  const { node, dataModels, instanceDataSources, applicationSettings, dataModelPath } = dataSources;
  let out = text;
  for (const idx in variables) {
    const variable = variables[idx];
    let value = variables[idx].key;

    if (variable.dataSource.startsWith('dataModel')) {
      const dataModelName = variable.dataSource.split('.')[1];
      const cleanPath = getKeyWithoutIndexIndicators(value);
      const transposedPath = dataModelPath
        ? transposeDataBinding({ subject: cleanPath, currentLocation: dataModelPath })
        : node?.transposeDataModel(cleanPath) || value;
      if (transposedPath) {
        const dataModel = dataModels.getReader(dataModelName);
        const stringValue = dataModel.getAsString(transposedPath);
        const hasDefaultValue = variable.defaultValue !== undefined && variable.defaultValue !== null;
        if (stringValue !== undefined) {
          value = stringValue;
        } else if (dataModel.isLoading()) {
          value = '...'; // TODO: Use a loading indicator, or at least let this value be configurable
        } else if (dataModelName === 'default' && !hasDefaultValue) {
          window.logWarn(
            `A text resource variable with key '${variable.key}' did not exist in the default data model. ` +
              `You should provide a specific data model name instead, and/or set a defaultValue.`,
          );
        } else if (dataModel.hasError() && !hasDefaultValue) {
          window.logWarn(
            `A text resource variable with key '${variable.key}' did not exist in the data model '${dataModelName}'. ` +
              `You may want to set a defaultValue to prevent the full key from being presented to the user.`,
          );
        }
      }
    } else if (variable.dataSource === 'instanceContext') {
      value = instanceDataSources && variable.key in instanceDataSources ? instanceDataSources[variable.key] : value;
    } else if (variable.dataSource === 'applicationSettings') {
      value =
        applicationSettings && variable.key in applicationSettings && applicationSettings[variable.key] !== undefined
          ? applicationSettings[variable.key]!
          : value;
    }

    if (value === variable.key) {
      /*
       By returning value if variable.defaultValue is null, we ensure
       that we are returning the dataModel path string instead of blank
       value. If app developers want to return blank value, they should
       set defaultValue to an empty string.
      */
      value = variable.defaultValue ?? value;
    }

    out = out.replaceAll(`{${idx}}`, value);
  }

  return out;
}

function getNestedObject(nestedObj: ILanguage, pathArr: string[]) {
  return pathArr.reduce((obj, key) => (obj && obj[key] !== 'undefined' ? obj[key] : undefined), nestedObj);
}

const replaceParameters = (nameString: string | undefined, params: SimpleLangParam[]) => {
  if (nameString === undefined) {
    return nameString;
  }

  let mutatingString = nameString;
  for (const index in params) {
    const param = params[index];
    let paramAsString: string | undefined;
    if (typeof param === 'string') {
      paramAsString = param;
    } else if (typeof param === 'number') {
      paramAsString = param.toString();
    }

    if (paramAsString !== undefined) {
      mutatingString = mutatingString.replaceAll(`{${index}}`, paramAsString);
    }
  }

  return mutatingString;
};

function isTextReference(obj: any): obj is TextReference {
  return (
    typeof obj === 'object' &&
    'key' in obj &&
    typeof obj.key === 'string' &&
    Object.keys(obj).length <= 3 &&
    Object.keys(obj).every((k) => k === 'key' || k === 'params' || k === 'makeLowerCase')
  );
}
