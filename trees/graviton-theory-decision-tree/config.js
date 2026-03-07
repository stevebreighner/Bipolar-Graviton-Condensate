window.APP_CONFIG = {
  appKey: "gravitonTheoryDecisionTree",
  pageTitle: "Graviton Theory Decision Tree",
  headerTitle: "Graviton Theory Decision Tree",
  headerSubtitle: "Track the current paper branches: graviton status and transfer process.",
  nodeTextPlaceholder: "Describe this graviton-theory branch or decision...",
  uiLabels: {
    tagOptionLabels: {
      decision: "Decision",
      action: "Branch",
      warning: "Constraint",
    },
    controlLabels: {
      addChildBtn: "Add Branch (Child)",
      addSiblingBtn: "Add Sibling",
      moveUpBtn: "Move Up",
      moveDownBtn: "Move Down",
      deleteAboveBtn: "Delete Above",
      deleteBtn: "Delete Node",
      resetBtn: "Reset Theory Tree",
    },
  },
  exportBaseName: "graviton-theory-decision-tree",
  printTitle: "Graviton Theory Decision Tree",
  resetConfirmText: "Reset tree to the current graviton theory branch map?",
  sampleTree: {
    id: "root",
    text: "Current theory branches: where does the paper go next?",
    tag: "decision",
    children: [
      {
        id: "graviton_status",
        text: "Graviton status: massless or massive?",
        tag: "decision",
        children: [
          {
            id: "massless_branch",
            text: "Massless branch",
            tag: "action",
            children: [
              {
                id: "massless_baseline",
                text: "Use the conventional graviton picture as the paper-one baseline",
                tag: "action",
                children: [],
              },
              {
                id: "massless_constraint",
                text: "No built-in core from mass alone; short-distance support still needs a separate mechanism",
                tag: "warning",
                children: [],
              },
            ],
          },
          {
            id: "massive_branch",
            text: "Massive or extended branch",
            tag: "action",
            children: [
              {
                id: "core_shell_idea",
                text: "Core / shell idea",
                tag: "action",
                children: [],
              },
              {
                id: "massive_support",
                text: "Use extended constituent structure to justify finite separation and short-range repulsion",
                tag: "action",
                children: [],
              },
              {
                id: "massive_constraint",
                text: "This departs from the standard massless GR graviton picture and needs a new field model",
                tag: "warning",
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: "transfer_process",
        text: "Transfer process: how does matter enter the condensate description?",
        tag: "decision",
        children: [
          {
            id: "transfer_option_1",
            text: "Option 1: conventional-leaning framing",
            tag: "action",
            children: [
              {
                id: "transfer_effective_desc",
                text: "Matter does not literally become gravitons; under extreme collapse the condensate is an effective description",
                tag: "action",
                children: [],
              },
              {
                id: "transfer_paper_one",
                text: "Use this as the main paper framing for now",
                tag: "action",
                children: [],
              },
            ],
          },
          {
            id: "transfer_option_2",
            text: "Option 2: transfer field / conversion mechanism",
            tag: "action",
            children: [
              {
                id: "transfer_field_branch",
                text: "New transfer field mediates matter-to-condensate conversion",
                tag: "action",
                children: [],
              },
              {
                id: "transfer_field_constraint",
                text: "Needs trigger conditions, conservation-law accounting, and field dynamics derivation",
                tag: "warning",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
};
