import React from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { PDFView } from 'src/features/pdf/PDFView';
import classes from 'src/features/pdf/PDFView.module.css';

export function PDFWrapper({ children }: PropsWithChildren) {
  const previewPDF = useDevToolsStore((state) => state.pdfPreview);
  const [searchParams] = useSearchParams();
  const renderInstead = searchParams.get('pdf') === '1';

  if (renderInstead) {
    return <PDFView />;
  }

  if (previewPDF) {
    return (
      <>
        <div className={classes['hide-form']}>{children}</div>
        <PDFView />
      </>
    );
  }

  return <>{children}</>;
}
