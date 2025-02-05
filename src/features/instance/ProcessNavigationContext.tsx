import React, { useCallback, useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { createContext } from 'src/core/contexts/context';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { useHasPendingAttachments } from 'src/features/attachments/AttachmentsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxInstance, useStrictInstance } from 'src/features/instance/InstanceContext';
import { useLaxProcessData, useSetProcessData } from 'src/features/instance/ProcessContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import type { IActionType, IProcess } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

interface ProcessNextProps {
  taskId?: string;
  action?: IActionType;
}

function useProcessNext() {
  // const submittingState = useAppSelector((state) => state.formData.submittingState);
  const { doProcessNext } = useAppMutations();
  const { reFetch: reFetchInstanceData } = useStrictInstance();
  const language = useCurrentLanguage();
  const setProcessData = useSetProcessData();
  const currentProcessData = useLaxProcessData();
  const { navigateToTask } = useNavigatePage();
  const instanceId = useLaxInstance()?.instanceId;
  const waitForSave = FD.useWaitForSave();

  const utils = useMutation({
    mutationFn: async ({ taskId, action }: ProcessNextProps = {}) => {
      if (!instanceId) {
        throw new Error('Missing instance ID, cannot perform process/next');
      }
      await waitForSave(true);
      return doProcessNext.call(instanceId, taskId, language, action);
    },
    onSuccess: async (data: IProcess) => {
      doProcessNext.setLastResult(data);
      await reFetchInstanceData();
      setProcessData?.({ ...data, processTasks: currentProcessData?.processTasks });
      navigateToTask(data?.currentTask?.elementId);
    },
    onError: (error: HttpClientError) => {
      window.logError('Process next failed:\n', error);
    },
  });

  const mutateAsync = utils.mutateAsync;
  const nativeMutate = useCallback(
    async (props: ProcessNextProps = {}) => {
      try {
        await mutateAsync(props);
      } catch (err) {
        // Do nothing, the error is handled above
      }
    },
    [mutateAsync],
  );

  // useEffect(() => {
  //   (async () => {
  //     if (submittingState === 'validationSuccessful') {
  //       await nativeMutate({});
  //       dispatch(FormDataActions.submitClear());
  //     }
  //   })();
  // }, [dispatch, nativeMutate, submittingState]);

  const perform = useCallback(
    async (props: ProcessNextProps) => {
      // if (submittingState !== 'inactive') {
      //   return;
      // }

      // if (
      //   realTaskType === ProcessTaskType.Data &&
      //   // Skipping the full form data submit if an action is set. Signing, rejecting, etc should not attempt to submit
      //   // form data, as you probably only have read-access to the data model at this point.
      //   !props?.action
      // ) {
      //   dispatch(FormDataActions.submit());
      //   return;
      // }

      // dispatch(FormDataActions.submitReady({ state: 'working' }));
      await nativeMutate(props || {});
    },
    [nativeMutate],
  );

  return { perform, error: utils.error };
}

interface ContextData {
  busy: boolean;
  busyWithId: string;
  canSubmit: boolean;
  attachmentsPending: boolean;
  next: (props: ProcessNextProps & { nodeId: string }) => Promise<void>;
}

const { Provider, useCtx } = createContext<ContextData | undefined>({
  name: 'ProcessNavigation',
  required: false,
  default: undefined,
});

export function ProcessNavigationProvider({ children }: React.PropsWithChildren) {
  const { perform, error } = useProcessNext();
  const [_busyWithId, setBusyWithId] = useState<string>('');
  // const submittingState = useAppSelector((state) => state.formData.submittingState);

  const attachmentsPending = useHasPendingAttachments();

  // const busyWithId = submittingState === 'inactive' ? '' : _busyWithId;
  const busyWithId = _busyWithId;

  const next = useCallback(
    async ({ nodeId, ...rest }: ProcessNextProps & { nodeId: string }) => {
      if (busyWithId) {
        return;
      }

      setBusyWithId(nodeId);
      await perform(rest);
    },
    [busyWithId, perform],
  );

  if (error) {
    return <DisplayError error={error} />;
  }

  return (
    <Provider
      value={{
        busy: !!busyWithId,
        busyWithId,
        canSubmit: !attachmentsPending && !busyWithId,
        attachmentsPending,
        next,
      }}
    >
      {children}
    </Provider>
  );
}

export const useProcessNavigation = () => useCtx();
