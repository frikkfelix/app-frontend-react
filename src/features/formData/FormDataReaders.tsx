import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

import dot from 'dot-object';

import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import { useDataTypeByLayoutSetId } from 'src/features/applicationMetadata/appMetadataUtils';
import { useAvailableDataModels } from 'src/features/datamodel/useAvailableDataModels';
import { useDataModelUrl } from 'src/features/datamodel/useBindingSchema';
import { useCurrentLayoutSetId } from 'src/features/form/layoutSets/useCurrentLayoutSetId';
import { FD } from 'src/features/formData/FormDataWrite';
import { useFormDataQuery } from 'src/features/formData/useFormDataQuery';
import { useAsRef } from 'src/hooks/useAsRef';
import { useNavigationParams } from 'src/hooks/useNavigatePage';

type ReaderMap = { [name: string]: DataModelReader };

interface Context {
  readers: DataModelReaders;
  updateModel: (newModel: DataModelReader, isDefault?: boolean) => void;
  availableModels: string[];
  reset: () => void;
}

const { Provider, useLaxCtx, useCtx } = createContext<Context>({
  name: 'GlobalFormDataReaders',
  required: true,
});

type Status = 'loading' | 'loaded' | 'error';

export class DataModelReader {
  constructor(
    protected name: string,
    protected model: object | undefined = undefined,
    protected status: Status = 'loading',
  ) {}

  getAsString(path: string): string | undefined {
    if (!this.model) {
      return undefined;
    }
    const realValue = dot.pick(path, this.model);
    if (typeof realValue === 'string' || typeof realValue === 'number' || typeof realValue === 'boolean') {
      return realValue.toString();
    }
    return undefined;
  }

  getName(): string {
    return this.name;
  }

  isLoading(): boolean {
    return this.status === 'loading';
  }

  hasError(): boolean {
    return this.status === 'error';
  }

  equals(other: DataModelReader): boolean {
    return this.name === other.name && this.model === other.model && this.status === other.status;
  }
}

type AccessingCallback = (dataModel: DataModelReader) => void;

export class DataModelReaders {
  protected onAccessingNewDataModel?: AccessingCallback;
  protected locallyAddedReaders: ReaderMap = {};

  constructor(
    protected readonly readers: ReaderMap,
    protected readonly defaultModel: string,
  ) {}

  getReader(dataModelName: string): DataModelReader {
    const name = dataModelName === 'default' ? this.defaultModel : dataModelName;

    if (this.locallyAddedReaders[name]) {
      return this.locallyAddedReaders[name];
    }

    if (!this.readers[name]) {
      const reader = new DataModelReader(name);
      if (this.onAccessingNewDataModel) {
        this.onAccessingNewDataModel(reader);
      }
      this.locallyAddedReaders[name] = reader;
      return reader;
    }
    return this.readers[name];
  }

  setOnAccessingNewDataModel(callback: AccessingCallback) {
    this.onAccessingNewDataModel = callback;
  }

  getAll(): DataModelReader[] {
    return Object.values(this.readers);
  }
}

/**
 * This provider gives us readers for both the current data model and any others we might need to load.
 * It should only be provided somewhere inside a FormDataWriteProvider when rendering a form.
 */
export function FormDataReadersProvider({ children }: PropsWithChildren) {
  const layoutSetId = useCurrentLayoutSetId();
  const currentDataType = useDataTypeByLayoutSetId(layoutSetId);
  const currentModel = FD.useDebounced();
  const { updateModel } = useCtx();

  useEffect(() => {
    if (!currentDataType) {
      return;
    }
    const newModel = new DataModelReader(currentDataType, currentModel, 'loaded');
    updateModel(newModel, true);
  }, [currentDataType, currentModel, updateModel]);

  return <>{children}</>;
}

/**
 * This globally available provider will fetch any data model, if possible, and provide readers for them.
 * This provider can live anywhere as long as it can get the application metadata. You also have to make sure
 * to render FormDataReadersProvider somewhere inside if rendering in a form, and render DataModelFetcher.
 */
export function GlobalFormDataReadersProvider({ children }: PropsWithChildren) {
  const availableModels = useAvailableDataModels().map((dm) => dm.id);
  const [defaultModelName, setDefaultModelName] = useState<string>('default');
  const [readerMap, setReaderMap] = useState<{ [name: string]: DataModelReader }>({});

  const updateModel = useCallback((newModel: DataModelReader, isDefault: boolean = false) => {
    setReaderMap((all) => {
      const existingModel = all[newModel.getName()];
      if (existingModel && !existingModel.isLoading() && newModel.isLoading()) {
        // Don't overwrite a loaded model with a loading one
        return all;
      }

      if (existingModel && existingModel.equals(newModel)) {
        // Don't overwrite a model with the same data
        return all;
      }

      return {
        ...all,
        [newModel.getName()]: newModel,
      };
    });
    if (isDefault) {
      setDefaultModelName(newModel.getName());
    }
  }, []);

  const readers = useMemo(() => {
    const readers = new DataModelReaders(readerMap, defaultModelName);
    readers.setOnAccessingNewDataModel((reader) => {
      // This may happen while components are rendering, so we need to defer the state update. The DataModelReaders
      // instance may choose to generate a new Reader when a new data model is accessed. We have to feed this back
      // into the state so that we'll know about the new reader, and try to fetch its data model.
      setTimeout(() => updateModel(reader), 0);
    });

    return readers;
  }, [defaultModelName, readerMap, updateModel]);

  const reset = useCallback(() => {
    setReaderMap({});
  }, []);

  return (
    <Provider
      value={{
        readers,
        updateModel,
        availableModels,
        reset,
      }}
    >
      {children}
    </Provider>
  );
}

/**
 * This utility will fetch any data model that is needed, and provide readers for them. Make sure to render this
 * somewhere in the tree, as early as possible, but also make sure it can read from all the providers it needs.
 */
export function DataModelFetcher() {
  const ctx = useLaxCtx();
  const { taskId } = useNavigationParams();
  const taskWas = useRef(taskId);

  // Reset the readers when the task changes
  const reset = ctx === ContextNotProvided ? undefined : ctx.reset;
  const resetRef = useAsRef(reset);
  useEffect(() => {
    if (taskId === taskWas.current) {
      return;
    }
    resetRef.current && resetRef.current();
    taskWas.current = taskId;
  }, [resetRef, taskId]);

  if (ctx == ContextNotProvided) {
    return null;
  }

  return (
    <>
      {ctx.readers.getAll().map((reader) => (
        <SpecificDataModelFetcher
          key={reader.getName()}
          reader={reader}
          isAvailable={ctx.availableModels.includes(reader.getName())}
        />
      ))}
    </>
  );
}

function SpecificDataModelFetcher({ reader, isAvailable }: { reader: DataModelReader; isAvailable: boolean }) {
  const url = useDataModelUrl(reader.getName());
  const enabled = isAvailable && reader.isLoading();
  const { data, error } = useFormDataQuery(enabled ? url : undefined);
  const { updateModel } = useCtx();

  useEffect(() => {
    if (data) {
      const newModel = new DataModelReader(reader.getName(), data, 'loaded');
      updateModel(newModel);
    }
  }, [data, reader, updateModel]);

  useEffect(() => {
    if (error) {
      const dataModelName = reader.getName();
      updateModel(new DataModelReader(dataModelName, undefined, 'error'));
      window.logErrorOnce(
        `One or more text resources look up variables from 'dataModel.${dataModelName}', but we failed to fetch it:\n`,
        error,
      );
    }
  }, [error, reader, updateModel]);

  useEffect(() => {
    if (!isAvailable) {
      updateModel(new DataModelReader(reader.getName(), undefined, 'error'));
      window.logErrorOnce(
        `One or more text resources look up variables from 'dataModel.${reader.getName()}', but ` +
          `it is not available to load`,
      );
    }
  }, [isAvailable, reader, updateModel]);

  return null;
}

const nullReaders = new DataModelReaders({}, 'default');
export const useDataModelReaders = () => {
  const ctx = useLaxCtx();
  if (ctx === ContextNotProvided) {
    return nullReaders;
  }

  return ctx.readers;
};
