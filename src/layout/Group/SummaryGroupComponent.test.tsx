import React from 'react';

import { SummaryGroupComponent } from 'src/layout/Group/SummaryGroupComponent';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

describe('SummaryGroupComponent', () => {
  let mockHandleDataChange: () => void;

  beforeEach(() => {
    mockHandleDataChange = jest.fn();
  });

  test('SummaryGroupComponent -- should match snapshot', async () => {
    const { asFragment } = await render();
    expect(asFragment()).toMatchSnapshot();
  });

  async function render() {
    return await renderWithNode<true, LayoutNode<'Summary'>>({
      nodeId: 'mySummary',
      inInstance: true,
      renderer: ({ node, root }) => {
        const groupNode = root.findById('groupComponent') as LayoutNode<'Group'>;
        return (
          <SummaryGroupComponent
            changeText={'Change'}
            onChangeClick={mockHandleDataChange}
            summaryNode={node}
            targetNode={groupNode}
          />
        );
      },
      queries: {
        fetchFormData: async () => ({
          mockGroup: [
            {
              mockDataBinding1: '1',
              mockDataBinding2: '2',
            },
          ],
        }),
        fetchLayouts: async () => ({
          FormLayout: {
            data: {
              layout: [
                {
                  type: 'Group',
                  id: 'groupComponent',
                  dataModelBindings: {
                    group: 'mockGroup',
                  },
                  textResourceBindings: {
                    title: 'mockGroupTitle',
                  },
                  children: ['0:mockId1', '1:mockId2'],
                  edit: {
                    multiPage: true,
                  },
                  maxCount: 3,
                },
                {
                  type: 'Input',
                  id: 'mockId1',
                  dataModelBindings: {
                    simpleBinding: 'mockGroup.mockDataBinding1',
                  },
                  readOnly: false,
                  required: false,
                  textResourceBindings: {
                    title: 'mockField1',
                  },
                },
                {
                  type: 'Input',
                  id: 'mockId2',
                  dataModelBindings: {
                    simpleBinding: 'mockGroup.mockDataBinding2',
                  },
                  readOnly: false,
                  required: false,
                  textResourceBindings: {
                    title: 'mockField2',
                  },
                },
                {
                  type: 'Summary',
                  id: 'mySummary',
                  componentRef: 'groupComponent',
                  largeGroup: false,
                },
              ],
            },
          },
        }),
        fetchTextResources: () =>
          Promise.resolve({
            language: 'nb',
            resources: [
              { id: 'mockGroupTitle', value: 'Mock group' },
              { id: 'mockField1', value: 'Mock field 1' },
              { id: 'mockField2', value: 'Mock field 2' },
            ],
          }),
      },
    });
  }
});
