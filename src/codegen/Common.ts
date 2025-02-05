import { CG, Variant } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';
import { DEFAULT_DEBOUNCE_TIMEOUT } from 'src/features/formData';
import type { MaybeSymbolizedCodeGenerator } from 'src/codegen/CodeGenerator';

const common = {
  ILayoutFile: () =>
    new CG.obj(
      new CG.prop('$schema', new CG.str().optional()),
      new CG.prop(
        'data',
        new CG.obj(
          new CG.prop(
            'layout',
            new CG.arr(
              new CG.raw({
                typeScript: new CG.linked(
                  new CG.import({
                    import: 'CompOrGroupExternal',
                    from: 'src/layout/layout.d',
                  }),
                  new CG.raw({
                    typeScript: 'never',
                  }),
                ),
                jsonSchema: () => ({
                  $ref: '#/definitions/AnyComponent',
                }),
              }),
            ),
          ),
          new CG.prop(
            'hidden',
            new CG.expr(ExprVal.Boolean)
              .setTitle('Hidden')
              .setDescription('Expression that will hide the page/form layout if true')
              .optional({ default: false }),
          ),
        ),
      ),
    )
      .setTitle('Altinn layout')
      .setDescription('Schema that describes the layout configuration for Altinn applications.'),

  ILabelSettings: () =>
    new CG.obj(
      new CG.prop(
        'optionalIndicator',
        new CG.bool().setTitle('Optional indicator').setDescription('Show optional indicator on label').optional(),
      ),
    ),

  IPageBreak: () =>
    new CG.obj(
      new CG.prop(
        'breakBefore',
        new CG.expr(ExprVal.String)
          .optional({ default: 'auto' })
          .setTitle('Page break before')
          .setDescription(
            'PDF only: Value or expression indicating whether a page break should be added before the component. ' +
              "Can be either: 'auto' (default), 'always', or 'avoid'.",
          )
          .addExample('auto', 'always', 'avoid'),
      ),
      new CG.prop(
        'breakAfter',
        new CG.expr(ExprVal.String)
          .optional({ default: 'auto' })
          .setTitle('Page break after')
          .setDescription(
            'PDF only: Value or expression indicating whether a page break should be added after the component. ' +
              "Can be either: 'auto' (default), 'always', or 'avoid'.",
          )
          .addExample('auto', 'always', 'avoid'),
      ),
    )
      .setTitle('Page break')
      .setDescription('Optionally insert page-break before/after component when rendered in PDF'),

  LayoutStyle: () =>
    new CG.enum('column', 'row', 'table')
      .asRealEnum((value) => value.charAt(0).toUpperCase() + value.slice(1))
      .setTitle('Layout')
      .setDescription('Define the layout style for the options'),

  // Grid styling:
  IGridSize: () => new CG.union(new CG.const('auto'), new CG.enum(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)),
  IGridStyling: () =>
    new CG.obj(
      new CG.prop('xs', CG.common('IGridSize').optional({ default: 'auto' })),
      new CG.prop('sm', CG.common('IGridSize').optional({ default: 'auto' })),
      new CG.prop('md', CG.common('IGridSize').optional({ default: 'auto' })),
      new CG.prop('lg', CG.common('IGridSize').optional({ default: 'auto' })),
      new CG.prop('xl', CG.common('IGridSize').optional({ default: 'auto' })),
    ),
  IGrid: () =>
    new CG.obj(
      new CG.prop('labelGrid', CG.common('IGridStyling').optional()),
      new CG.prop('innerGrid', CG.common('IGridStyling').optional()),
    )
      .extends(CG.common('IGridStyling'))
      .setTitle('Grid')
      .setDescription('Settings for the components grid. Used for controlling horizontal alignment'),

  // Panel display mode:
  IPanelBase: () =>
    new CG.obj(
      new CG.prop(
        'variant',
        new CG.enum('info', 'warning', 'error', 'success')
          .optional()
          .setTitle('Panel variant')
          .setDescription('Change the look of the panel'),
      ),
      new CG.prop(
        'showIcon',
        new CG.bool().optional({ default: true }).setTitle('Show icon').setDescription('Show icon in the panel header'),
      ),
    ),

  // Data model bindings:
  IDataModelBindingsSimple: () =>
    new CG.obj(new CG.prop('simpleBinding', new CG.str()))
      .setTitle('Data model binding')
      .setDescription(
        'Describes the location in the data model where the component should store its value(s). A simple ' +
          'binding is used for components that only store a single value, usually a string.',
      ),
  IDataModelBindingsOptionsSimple: () =>
    new CG.obj(
      new CG.prop('simpleBinding', new CG.str()),
      new CG.prop(
        'metadata',
        new CG.str()
          .optional()
          .setDescription(
            'Describes the location where metadata for the option based component should be stored in the datamodel.',
          ),
      ),
    )
      .setTitle('Data model binding')
      .setDescription(
        'Describes the location in the data model where the component should store its value(s). A simple ' +
          'binding is used for components that only store a single value, usually a string.',
      ),
  IDataModelBindingsList: () =>
    new CG.obj(new CG.prop('list', new CG.str()))
      .setTitle('Data model binding')
      .setDescription(
        'Describes the location in the data model where the component should store its value(s). A list binding ' +
          'should be pointed to an array structure in the data model, and is used for components that store multiple ' +
          'simple values (e.g. a list of strings).',
      ),

  // Text resource bindings:
  TRBSummarizable: () =>
    makeTRB({
      summaryTitle: {
        title: 'Summary title',
        description: 'Title used in the summary view (overrides the default title)',
      },
      summaryAccessibleTitle: {
        title: 'Accessible summary title',
        description:
          'Title used for aria-label on the edit button in the summary view (overrides the default and summary title)',
      },
    }),
  TRBFormComp: () =>
    makeTRB({
      tableTitle: {
        title: 'Table title',
        description: 'Title used in the table view (overrides the default title)',
      },
      shortName: {
        title: 'Short name (for validation)',
        description: 'Alternative name used for required validation messages (overrides the default title)',
      },
      requiredValidation: {
        title: 'Required validation message',
        description:
          'Full validation message shown when the component is required and no value has been entered (overrides both the default and shortName)',
      },
    }),
  TRBLabel: () =>
    makeTRB({
      title: {
        title: 'Title',
        description: 'Label text/title shown above the component',
      },
      description: {
        title: 'Description',
        description: 'Label description shown above the component, below the title',
      },
      help: {
        title: 'Help text',
        description: 'Help text shown in a tooltip when clicking the help button',
      },
    }),

  // Options/code lists:
  IOption: () =>
    new CG.obj(
      new CG.prop('label', new CG.str()),
      new CG.prop('value', new CG.str()),
      new CG.prop('description', new CG.str().optional()),
      new CG.prop('helpText', new CG.str().optional()),
    ).addExample({ label: '', value: '' }),
  IMapping: () =>
    new CG.obj()
      .additionalProperties(new CG.str())
      .setTitle('Mapping')
      .setDescription(
        'A mapping of key-value pairs (usually used for mapping a path in the data model to a query string parameter).',
      ),
  IQueryParameters: () =>
    new CG.obj()
      .additionalProperties(new CG.str())
      .setTitle('Query parameters')
      .setDescription(
        'A mapping of query string parameters to values. Will be appended to the URL when fetching options.',
      ),
  IOptionSource: () =>
    new CG.obj(
      new CG.prop(
        'group',
        new CG.str()
          .setTitle('Group')
          .setDescription('The repeating group to base options on.')
          .addExample('model.some.group'),
      ),
      new CG.prop(
        'label',
        new CG.expr(ExprVal.String)
          .setTitle('Label')
          .setDescription(
            'A label of the option displayed in Radio- and Checkbox groups. Can be plain text, a text resource binding, or a dynamic expression.',
          )
          .addExample('some.text.key'),
      ),
      new CG.prop(
        'value',
        new CG.str()
          .setTitle('Value')
          .setDescription('Field in the group that should be used as value')
          .addExample('model.some.group[{0}].someField'),
      ),
      new CG.prop(
        'description',
        new CG.expr(ExprVal.String)
          .optional()
          .setTitle('Description')
          .setDescription(
            'A description of the option displayed in Radio- and Checkbox groups. Can be plain text, a text resource binding, or a dynamic expression.',
          )
          .addExample('some.text.key', 'My Description'),
      ),
      new CG.prop(
        'helpText',
        new CG.expr(ExprVal.String)
          .optional()
          .setTitle('Help Text')
          .setDescription(
            'A help text for the option displayed in Radio- and Checkbox groups. Can be plain text, a text resource binding, or a dynamic expression.',
          )
          .addExample('some.text.key', 'My Help Text'),
      ),
    )
      .setTitle('Option source')
      .setDescription('Allows for fetching options from the data model, pointing to a repeating group structure'),
  ISelectionComponent: () =>
    new CG.obj(
      new CG.prop(
        'optionsId',
        new CG.str()
          .optional()
          .setTitle('Dynamic options (fetched from server)')
          .setDescription('ID of the option list to fetch from the server'),
      ),
      new CG.prop('mapping', CG.common('IMapping').optional()),
      new CG.prop('queryParameters', CG.common('IQueryParameters').optional()),
      new CG.prop(
        'options',
        new CG.arr(CG.common('IOption')).optional().setTitle('Static options').setDescription('List of static options'),
      ),
      new CG.prop(
        'secure',
        new CG.bool()
          .optional({ default: false })
          .setTitle('Secure options (when using optionsId)')
          .setDescription(
            'Whether to call the secure API endpoint when fetching options from the ' +
              'server (allows for user/instance-specific options)',
          ),
      ),
      new CG.prop(
        'sortOrder',
        new CG.enum('asc', 'desc')
          .setDescription('Sorts the code list in either ascending or descending order by label.')
          .optional(),
      ),
      new CG.prop('source', CG.common('IOptionSource').optional()),
    ),
  ISelectionComponentFull: () =>
    new CG.obj(
      new CG.prop(
        'preselectedOptionIndex',
        new CG.int()
          .optional()
          .setTitle('Preselected option index')
          .setDescription('Index of the option to preselect (if no option has been selected yet)'),
      ),
    ).extends(CG.common('ISelectionComponent')),

  // Table configuration:
  ITableColumnsAlignText: () =>
    new CG.enum('left', 'center', 'right')
      .setTitle('Align Text')
      .setDescription(
        "Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers.",
      ),
  ITableColumnsTextOverflow: () =>
    new CG.obj(
      new CG.prop(
        'lineWrap',
        new CG.bool()
          .optional({ default: true })
          .setTitle('Line Wrap')
          .setDescription('Toggle line wrapping on or off. Defaults to true'),
      ),
      new CG.prop(
        'maxHeight',
        new CG.num()
          .optional({ default: 2 })
          .setTitle('Max Height')
          .setDescription(
            'Determines the number of lines to display in table cell before hiding the rest of the ' +
              'text with an ellipsis (...). Defaults to 2.',
          ),
      ),
    ),
  ITableColumnFormatting: () => new CG.obj().additionalProperties(CG.common('ITableColumnProperties')),
  ITableColumnProperties: () =>
    new CG.obj(
      new CG.prop(
        'width',
        new CG.str()
          .optional({ default: 'auto' })
          .setTitle('Width')
          .setDescription("Width of cell in % or 'auto'. Defaults to 'auto'")
          .setPattern(/^([0-9]{1,2}%|100%|auto)$/),
      ),
      new CG.prop('alignText', CG.common('ITableColumnsAlignText').optional()),
      new CG.prop('textOverflow', CG.common('ITableColumnsTextOverflow').optional()),
    )
      .setTitle('Column options')
      .setDescription('Options for the row/column')
      .addExample({
        width: 'auto',
        alignText: 'left',
        textOverflow: {
          lineWrap: true,
          maxHeight: 2,
        },
      }),

  // Types that component definitions extend:
  ComponentBase: () =>
    new CG.obj(
      new CG.prop(
        'id',
        new CG.str()
          .setPattern(/^[0-9a-zA-Z][0-9a-zA-Z-]*(-?[a-zA-Z]+|[a-zA-Z][0-9]+|-[0-9]{6,})$/)
          .setTitle('ID')
          .setDescription(
            'The component ID. Must be unique within all layouts/pages in a layout-set. Cannot end with <dash><number>.',
          ),
      ),
      new CG.prop(
        'hidden',
        new CG.expr(ExprVal.Boolean)
          .optional({ default: false })
          .setTitle('Hidden')
          .setDescription(
            'Boolean value or expression indicating if the component should be hidden. Defaults to false.',
          ),
      ),
      new CG.prop('grid', CG.common('IGrid').optional()),
      new CG.prop('pageBreak', CG.common('IPageBreak').optional()),

      // Internal-only properties (these are added by the hierarchy generator):
      new CG.prop('baseComponentId', new CG.str().optional()).onlyIn(Variant.Internal),
      new CG.prop('multiPageIndex', new CG.int().optional()).onlyIn(Variant.Internal),
    ),
  FormComponentProps: () =>
    new CG.obj(
      new CG.prop(
        'readOnly',
        new CG.expr(ExprVal.Boolean)
          .optional({ default: false })
          .setTitle('Read only/disabled?')
          .setDescription(
            'Boolean value or expression indicating if the component should be read only/disabled. Defaults to false. <br /> <i>Please note that even with read-only fields in components, it may currently be possible to update the field by modifying the request sent to the API or through a direct API call.<i/>',
          ),
      ),
      new CG.prop(
        'required',
        new CG.expr(ExprVal.Boolean)
          .optional({ default: false })
          .setTitle('Required?')
          .setDescription(
            'Boolean value or expression indicating if the component should be required. Defaults to false.',
          ),
      ),
      new CG.prop('showValidations', CG.common('AllowedValidationMasks').optional()),
    ),
  SummarizableComponentProps: () =>
    new CG.obj(
      new CG.prop(
        'renderAsSummary',
        new CG.expr(ExprVal.Boolean)
          .optional({ default: false })
          .setTitle('Render as summary')
          .setDescription(
            'Boolean value or expression indicating if the component should be rendered as a summary. Defaults to false.',
          ),
      ),
    ),
  LabeledComponentProps: () => new CG.obj(new CG.prop('labelSettings', CG.common('ILabelSettings').optional())),

  // Reusable Grid component properties (used by both Grid and repeating Group):
  GridComponentRef: () =>
    new CG.obj(
      new CG.prop('component', new CG.str().optional().setTitle('Component ID').setDescription('ID of the component')),
    ),
  GridCellLabelFrom: () =>
    new CG.obj(
      new CG.prop(
        'labelFrom',
        new CG.str()
          .setTitle('Fetch label from other component')
          .setDescription('Set this to a component id to display the label from that component'),
      ),
    ).extends(CG.common('ITableColumnProperties')),
  GridCellText: () =>
    new CG.obj(
      new CG.prop(
        'text',
        new CG.str().setTitle('Text').setDescription('Text to display (can also be a key in text resources)'),
      ),
      new CG.prop('help', new CG.str().optional().setTitle('Help').setDescription('Help text to display')),
    ).extends(CG.common('ITableColumnProperties')),
  GridCell: () =>
    new CG.union(
      new CG.linked(
        CG.common('GridComponentRef'),
        new CG.import({
          import: 'GridComponent',
          from: 'src/layout/Grid/types',
        }),
      ),
      CG.null,
      CG.common('GridCellText'),
      CG.common('GridCellLabelFrom'),
    ),
  GridRow: () =>
    new CG.obj(
      new CG.prop('header', new CG.bool().optional({ default: false }).setTitle('Is header row?')),
      new CG.prop('readOnly', new CG.bool().optional({ default: false }).setTitle('Is row read-only?')),
      new CG.prop('columnOptions', CG.common('ITableColumnProperties').optional()),
      new CG.prop(
        'cells',
        new CG.arr(CG.common('GridCell'))
          .setTitle('Cells in table row')
          .setDescription('The list of cells in this row'),
      ),
    ),
  GridRows: () =>
    new CG.arr(CG.common('GridRow'))
      .setTitle('Rows in Grid or Grid-like component')
      .setDescription('The list of rows in this grid')
      .addExample([
        {
          header: false,
          readOnly: false,
          cells: [{ text: 'hello.world' }, { component: 'myOtherComponent' }],
        },
      ]),

  SaveWhileTyping: () =>
    new CG.num()
      .optional({ default: DEFAULT_DEBOUNCE_TIMEOUT })
      .setTitle('Automatic saving while typing')
      .setDescription(
        `Lets you control how long we wait before saving the value locally while typing. ` +
          `This value is usually also used to determine how long we wait before saving the value to the server. ` +
          `The default value is ${DEFAULT_DEBOUNCE_TIMEOUT} milliseconds.`,
      )
      .setTsComment(
        'Beware, this used to be a number OR boolean value in v3.\n' +
          'It can be smart to check the type of this value before using it.',
      ),

  HTMLAutoCompleteValues: () =>
    new CG.enum(
      ...['on', 'off', 'name', 'honorific-prefix', 'given-name', 'additional-name'],
      ...['family-name', 'honorific-suffix', 'nickname', 'email', 'username', 'new-password', 'current-password'],
      ...['one-time-code', 'organization-title', 'organization', 'street-address', 'address-line1', 'address-line2'],
      ...['address-line3', 'address-level4', 'address-level3', 'address-level2', 'address-level1', 'country'],
      ...['country-name', 'postal-code', 'cc-name', 'cc-given-name', 'cc-additional-name', 'cc-family-name'],
      ...['cc-number', 'cc-exp', 'cc-exp-month', 'cc-exp-year', 'cc-csc', 'cc-type', 'transaction-currency'],
      ...['transaction-amount', 'language', 'bday', 'bday-day', 'bday-month', 'bday-year', 'sex', 'tel'],
      ...['tel-country-code', 'tel-national', 'tel-area-code', 'tel-local', 'tel-extension', 'impp', 'url', 'photo'],
    )
      .setTitle('HTML autocomplete values')
      .setDescription(
        'Autocomplete hints to the browser. See https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete',
      ),

  HeadingLevel: () => new CG.enum(2, 3, 4, 5, 6),

  AllowedValidationMasks: () =>
    new CG.arr(
      new CG.enum('Schema', 'Component', 'Expression', 'CustomBackend', 'Required', 'AllExceptRequired', 'All'),
    )
      .setTitle('Validation types')
      .setDescription('List of validation types to show'),

  PageValidation: () =>
    new CG.obj(
      new CG.prop(
        'page',
        new CG.enum('current', 'currentAndPrevious', 'all')
          .setTitle('Page')
          .setDescription('Which pages should be validated when the next button is clicked.'),
      ),
      new CG.prop('show', CG.common('AllowedValidationMasks')),
    ),

  // Layout settings:
  IComponentsSettings: () =>
    new CG.obj(
      new CG.prop(
        'excludeFromPdf',
        new CG.arr(new CG.str())
          .setTitle('Exclude from PDF')
          .setDescription('List of components to exclude from the PDF generation'),
      ),
    ),
  GlobalPageSettings: () =>
    new CG.obj(
      new CG.prop(
        'hideCloseButton',
        new CG.bool()
          .optional({ default: false })
          .setTitle('Hide close button')
          .setDescription('Hide the close button in the upper right corner of the app'),
      ),
      new CG.prop(
        'showLanguageSelector',
        new CG.bool()
          .optional({ default: false })
          .setTitle('Show language selector')
          .setDescription('Show the language selector in the upper right corner of the app'),
      ),
      new CG.prop(
        'showExpandWidthButton',
        new CG.bool()
          .optional({ default: false })
          .setTitle('Show expand width button')
          .setDescription('Show the expand width button in the upper right corner of the app'),
      ),
      new CG.prop(
        'showProgress',
        new CG.bool()
          .optional({ default: false })
          .setTitle('Show progress indicator')
          .setDescription(
            'Enables a progress indicator in the upper right corner of the app (when on data tasks/forms)',
          ),
      ),
      new CG.prop(
        'autoSaveBehavior',
        new CG.enum('onChangeFormData', 'onChangePage')
          .optional({ default: 'onChangeFormData' })
          .setTitle('Auto save behavior')
          .setDescription(
            'An attribute specifying when the application will save form data. onChangeFormData saves on every interaction with form elements. onChangePage saves on every page change.',
          ),
      ),
    ),
  IPagesBaseSettings: () =>
    new CG.obj(
      new CG.prop(
        'order',
        new CG.arr(new CG.str())
          .setTitle('Page order')
          .setDescription('List of pages in the order they should appear in the application'),
      ),
      new CG.prop(
        'excludeFromPdf',
        new CG.arr(new CG.str())
          .optional()
          .setTitle('Exclude from PDF')
          .setDescription('List of pages to exclude from the PDF generation'),
      ),
      new CG.prop(
        'pdfLayoutName',
        new CG.str()
          .optional()
          .setTitle('PDF layout name')
          .setDescription(
            'Name of a custom layout file to use for PDF creation instead of the automatically generated PDF.',
          ),
      ),
    ),
  IPagesSettings: () => new CG.obj().extends(CG.common('GlobalPageSettings')).extends(CG.common('IPagesBaseSettings')),
  ILayoutSettings: () =>
    new CG.obj(
      new CG.prop('pages', CG.common('IPagesSettings')),
      new CG.prop('components', CG.common('IComponentsSettings').optional()),

      new CG.prop(
        'receiptLayoutName',
        new CG.str()
          .optional()
          .setTitle('Receipt layout name')
          .setDescription(
            'DEPRECATED: Receipt layout name. This configuration setting will be moved so that custom receipts can work when reloading the page.',
          ),
      ),
    )
      .setTitle('Layout settings')
      .setDescription('Settings regarding layout pages and components'),

  // Layout sets:
  ILayoutSets: () =>
    new CG.obj(
      new CG.prop(
        'sets',
        new CG.arr(CG.common('ILayoutSet'))
          .setTitle('Layout sets')
          .setDescription('List of layout sets for different data types'),
      ),
      new CG.prop('uiSettings', CG.common('GlobalPageSettings').optional()),
    )
      .setTitle('Layout sets')
      .setDescription('Settings regarding layout pages and components'),
  ILayoutSet: () =>
    new CG.obj(
      new CG.prop(
        'id',
        new CG.str().setTitle('ID').setDescription('The layout-set ID. Must be unique within a given application.'),
      ),
      new CG.prop('dataType', new CG.str().setTitle('Data type').setDescription('The datatype to use this layoyut.')),
      new CG.prop(
        'tasks',
        new CG.arr(new CG.str())
          .optional()
          .setTitle('Tasks')
          .setDescription('An array specifying which task to use a layout-set'),
      ),
    )
      .setTitle('Layout set')
      .setDescription('Settings regarding a specific layout-set'),
};

export type ValidCommonKeys = keyof typeof common;

interface TRB {
  title: string;
  description: string;
}

function makeTRB(keys: { [key: string]: TRB }) {
  const obj = new CG.obj();
  for (const prop in keys) {
    const val = keys[prop];
    obj.addProperty(
      new CG.trb({
        name: prop,
        title: val.title,
        description: val.description,
      }),
    );
  }
  return obj;
}

const implementationsCache: { [key: string]: MaybeSymbolizedCodeGenerator<any> } = {};
export function getSourceForCommon(key: ValidCommonKeys) {
  if (implementationsCache[key]) {
    return implementationsCache[key];
  }

  const impl = common[key]();
  impl.exportAs(key);
  implementationsCache[key] = impl;
  return impl;
}

export function commonContainsVariationDifferences(key: ValidCommonKeys): boolean {
  return getSourceForCommon(key).containsVariationDifferences();
}

export function generateAllCommonTypes() {
  for (const key in common) {
    getSourceForCommon(key as ValidCommonKeys);
  }
}

export function generateCommonTypeScript() {
  for (const key in common) {
    const val = getSourceForCommon(key as ValidCommonKeys);

    // Calling toTypeScript() on an exported symbol will register it in the currently
    // generated file, so there's no need to output the result here
    if (val.containsVariationDifferences()) {
      val.transformTo(Variant.External).toTypeScript();
      val.transformTo(Variant.Internal).toTypeScript();
    } else {
      val.transformTo(Variant.External).toTypeScript();
    }
  }
}

export function generateCommonSchema() {
  for (const key in common) {
    const val = getSourceForCommon(key as ValidCommonKeys);
    val.transformTo(Variant.External).toJsonSchema();
  }
}
