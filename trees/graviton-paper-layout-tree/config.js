window.APP_CONFIG = {
  appKey: "gravitonPaperLayoutTree",
  pageTitle: "Graviton Paper Layout Tree",
  headerTitle: "Graviton Paper Layout Tree",
  headerSubtitle: "Single-trunk map for paper sequencing: graviton status first, transfer framing second.",
  nodeTextPlaceholder: "Describe this paper-route step or decision...",
  uiLabels: {
    tagOptionLabels: {
      decision: "Decision",
      action: "Route",
      warning: "Constraint",
    },
    controlLabels: {
      addChildBtn: "Add Route (Child)",
      addSiblingBtn: "Add Sibling",
      moveUpBtn: "Move Up",
      moveDownBtn: "Move Down",
      deleteAboveBtn: "Delete Above",
      deleteBtn: "Delete Node",
      resetBtn: "Reset Paper Tree",
    },
  },
  exportBaseName: "graviton-paper-layout-tree",
  printTitle: "Graviton Paper Layout Tree",
  resetConfirmText: "Reset tree to the current paper layout map?",
  sampleTree: {
    id: "root",
    text: "Paper layout: choose the sequence of claims",
    tag: "decision",
    children: [
      {
        id: "paper_trunk",
        text: "Primary trunk: start with graviton status, then place the transfer process underneath it",
        tag: "decision",
        children: [
          {
            id: "massless_start",
            text: "Massless first",
            tag: "action",
            children: [
              {
                id: "massless_conventional",
                text: "Then use the conventional transfer framing",
                tag: "action",
                children: [
                  {
                    id: "paper_one_route",
                    text: "Route 1: Paper 1 stays closest to standard thinking",
                    tag: "action",
                    children: [],
                  },
                  {
                    id: "paper_one_scope",
                    text: "Treat the condensate as an effective description under extreme collapse",
                    tag: "action",
                    children: [],
                  },
                ],
              },
              {
                id: "massless_transfer_field",
                text: "Then switch to the transfer-field framing",
                tag: "action",
                children: [
                  {
                    id: "hybrid_route",
                    text: "Route 2: keep the graviton massless but open a second paper on the conversion mechanism",
                    tag: "action",
                    children: [],
                  },
                  {
                    id: "hybrid_constraint",
                    text: "Needs trigger conditions and conservation-law accounting",
                    tag: "warning",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            id: "massive_start",
            text: "Massive or extended first",
            tag: "action",
            children: [
              {
                id: "massive_core_shell",
                text: "Use the core / shell support idea",
                tag: "action",
                children: [
                  {
                    id: "massive_transfer_field",
                    text: "Then use the transfer-field framing",
                    tag: "action",
                    children: [
                      {
                        id: "full_option_two_route",
                        text: "Route 3: option 2 for both branches, likely a separate speculative paper",
                        tag: "action",
                        children: [],
                      },
                      {
                        id: "full_option_two_constraint",
                        text: "Requires a new field model plus internal-structure justification",
                        tag: "warning",
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};
