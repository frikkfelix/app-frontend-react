import React from 'react';

import { Button } from '@digdir/design-system-react';
import { Grid } from '@material-ui/core';

import { usePageNavigationContext } from 'src/features/form/layout/PageNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { useOnPageNavigationValidation } from 'src/features/validation/callbacks/onPageNavigationValidation';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import classes from 'src/layout/NavigationButtons/NavigationButtonsComponent.module.css';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { PropsFromGenericComponent } from 'src/layout';
export type INavigationButtons = PropsFromGenericComponent<'NavigationButtons'>;

export function NavigationButtonsComponent({ node }: INavigationButtons) {
  const { id, showBackButton, textResourceBindings, validateOnNext, validateOnPrevious } = node.item;
  const { navigateToPage, next, previous, maybeSaveOnPageChange } = useNavigatePage();
  const { returnToView, setReturnToView } = usePageNavigationContext();

  const refPrev = React.useRef<HTMLButtonElement>(null);
  const refNext = React.useRef<HTMLButtonElement>(null);

  const nextTextKey = returnToView ? 'form_filler.back_to_summary' : textResourceBindings?.next || 'next';
  const backTextKey = textResourceBindings?.back || 'back';

  const parentIsPage = node.parent instanceof LayoutPage;

  const disablePrevious = previous === undefined;
  const disableNext = next === undefined;

  const onPageNavigationValidation = useOnPageNavigationValidation();

  const getScrollPosition = React.useCallback(
    () => document.querySelector(`[data-componentid="${id}"]`)?.getClientRects().item(0)?.y,
    [id],
  );

  /**
   * If validation fails the ErrorReport will move the buttons down.
   * This resets the scroll position so that the buttons are in the same place.
   */
  const resetScrollPosition = async (prevScrollPosition: number | undefined) => {
    if (prevScrollPosition === undefined) {
      return;
    }
    window.requestAnimationFrame(() => {
      const newScrollPosition = getScrollPosition();
      if (typeof prevScrollPosition === 'number' && typeof newScrollPosition === 'number') {
        window.scrollBy({ top: newScrollPosition - prevScrollPosition });
      }
    });
  };

  const onClickPrevious = async () => {
    if (!previous || disablePrevious) {
      return;
    }

    maybeSaveOnPageChange();

    const prevScrollPosition = getScrollPosition();
    if (validateOnPrevious && (await onPageNavigationValidation(node.top, validateOnPrevious))) {
      // Block navigation if validation fails
      resetScrollPosition(prevScrollPosition);
      return;
    }

    navigateToPage(previous, { skipAutoSave: true });
  };

  const OnClickNext = async () => {
    const goToView = returnToView || next;
    if (!goToView || disableNext) {
      return;
    }

    maybeSaveOnPageChange();

    const prevScrollPosition = getScrollPosition();
    if (validateOnNext && (await onPageNavigationValidation(node.top, validateOnNext)) && !returnToView) {
      // Block navigation if validation fails, unless returnToView is set (Back to summary)
      resetScrollPosition(prevScrollPosition);
      return;
    }

    setReturnToView(undefined);
    navigateToPage(goToView, { skipAutoSave: true });
  };

  return (
    <div
      data-testid='NavigationButtons'
      className={classes.container}
      style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}
    >
      {!disablePrevious && showBackButton && (
        <Grid item>
          <Button
            ref={refPrev}
            size='small'
            onClick={onClickPrevious}
            disabled={disablePrevious}
          >
            <Lang id={backTextKey} />
          </Button>
        </Grid>
      )}
      {!disableNext && (
        <Grid item>
          <Button
            ref={refNext}
            size='small'
            onClick={OnClickNext}
            disabled={disableNext}
          >
            <Lang id={nextTextKey} />
          </Button>
        </Grid>
      )}
    </div>
  );
}
