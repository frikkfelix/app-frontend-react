import React, { useMemo, useState } from 'react';

import { Pagination } from '@altinn/altinn-design-system';
import { LegacyFieldSet, LegacyResponsiveTable } from '@digdir/design-system-react';
import type { DescriptionText } from '@altinn/altinn-design-system/dist/types/src/components/Pagination/Pagination';
import type { ChangeProps, LegacyResponsiveTableConfig, SortDirection } from '@digdir/design-system-react';

import { useDataListQuery } from 'src/features/dataLists/useDataListQuery';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLanguage } from 'src/features/language/useLanguage';
import { GenericComponentLegend } from 'src/layout/GenericComponentUtils';
import type { Filter } from 'src/features/dataLists/useDataListQuery';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindingsForList } from 'src/layout/List/config.generated';

export type IListProps = PropsFromGenericComponent<'List'>;

const defaultDataList: any[] = [];
const defaultBindings: IDataModelBindingsForList = {};

export const ListComponent = ({ node }: IListProps) => {
  const { tableHeaders, pagination, sortableColumns, tableHeadersMobile, mapping, secure, dataListId } = node.item;
  const { langAsString, language, lang } = useLanguage();
  const [pageSize, setPageSize] = useState<number>(pagination?.default || 0);
  const [pageNumber, setPageNumber] = useState<number>(0);
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<SortDirection>('notActive');
  const filter = useMemo(
    () =>
      ({
        pageSize,
        pageNumber,
        sortColumn,
        sortDirection,
      }) as Filter,
    [pageNumber, pageSize, sortColumn, sortDirection],
  );
  const { data } = useDataListQuery(filter, dataListId, secure, mapping);
  const calculatedDataList = (data && data.listItems) || defaultDataList;

  const bindings = node.item.dataModelBindings || defaultBindings;
  const saveData = FD.useMultiSetForBindings(bindings);
  const formData = FD.usePickFreshStrings(bindings);

  const handleChange = ({ selectedValue: selectedValue }: ChangeProps<Record<string, string>>) => {
    const changes: { binding: string; newValue: string }[] = [];
    for (const binding of Object.keys(bindings)) {
      changes.push({ binding, newValue: selectedValue[binding] });
    }
    saveData(changes);
  };

  const tableHeadersValues = { ...tableHeaders };
  for (const key in tableHeaders) {
    tableHeadersValues[key] = langAsString(tableHeaders[key]);
  }

  const selectedRow: Record<string, string> = React.useMemo(() => {
    let matchRow: boolean[] = [];
    if (!formData || Object.keys(formData).length === 0) {
      return {};
    }
    for (const row of calculatedDataList) {
      for (const key in formData) {
        matchRow.push(formData[key] === row[key]);
      }
      if (!matchRow.includes(false)) {
        return row;
      }
      matchRow = [];
    }
    return {};
  }, [formData, calculatedDataList]);

  const renderPagination = () =>
    pagination && (
      <Pagination
        numberOfRows={data?._metaData.totaltItemsCount}
        rowsPerPageOptions={pagination?.alternatives ? pagination?.alternatives : []}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
          setPageSize(parseInt(event.target.value, 10));
        }}
        currentPage={pageNumber}
        setCurrentPage={(newPage: number) => {
          setPageNumber(newPage);
        }}
        descriptionTexts={((language && language['list_component']) || {}) as unknown as DescriptionText}
      />
    );

  const config: LegacyResponsiveTableConfig<Record<string, string>> = {
    rows: calculatedDataList,
    headers: tableHeadersValues,
    showColumnsMobile: tableHeadersMobile,
    columnSort: {
      onSortChange: ({ column, next }) => {
        setSortColumn(column);
        setSortDirection(next);
      },
      sortable: sortableColumns ? sortableColumns : [],
      currentlySortedColumn: sortColumn,
      currentDirection: sortDirection,
    },
    rowSelection: {
      onSelectionChange: (row) => handleChange({ selectedValue: row }),
      selectedValue: selectedRow,
    },
    renderCell: Object.keys(tableHeaders).reduce(
      // Add lang as the renderCell function for all inputs that are of type string.
      (acc, next) => ({ ...acc, [next]: (v) => (typeof v === 'string' ? lang(v) : v) }),
      {},
    ),
    footer: renderPagination(),
  };

  return (
    <LegacyFieldSet
      legend={<GenericComponentLegend />}
      style={{ width: '100%' }}
    >
      <div style={{ overflow: 'auto' }}>
        <LegacyResponsiveTable config={config} />
      </div>
    </LegacyFieldSet>
  );
};
