const APP_CONFIG = window.APP_CONFIG || {
  appKey: "decisionTree",
  pageTitle: "Decision Tree App",
  headerTitle: "Decision Tree",
  headerSubtitle: "Map your process and export it.",
  nodeTextPlaceholder: "Describe this step or decision...",
  exportBaseName: "decision-tree",
  printTitle: "Decision Tree",
  resetConfirmText: "Reset tree to sample flow?",
  sampleTree: {
    id: "root",
    text: "Start",
    tag: "decision",
    children: [],
  },
};
const DEFAULT_UI_LABELS = {
  tagOptionLabels: {
    decision: "Decision",
    action: "Action",
    warning: "Warning",
  },
  controlLabels: {
    addChildBtn: "Add Fork (Child)",
    addSiblingBtn: "Add Sibling",
    moveUpBtn: "Move Up",
    moveDownBtn: "Move Down",
    deleteAboveBtn: "Delete Above",
    deleteBtn: "Delete Node",
    resetBtn: "Reset Sample Tree",
  },
};

const APP_KEY = APP_CONFIG.appKey || "decisionTree";
const STORAGE_KEY = `${APP_KEY}.tree.v1`;
const BACKEND_STORAGE_KEY = `${APP_KEY}.backend.v1`;
const LAYOUT_STORAGE_KEY = `${APP_KEY}.layout.v1`;
const SNAPSHOTS_STORAGE_KEY = `${APP_KEY}.snapshots.v1`;
const EXPORT_BASE_NAME = APP_CONFIG.exportBaseName || "decision-tree";
const PRINT_TITLE = APP_CONFIG.printTitle || APP_CONFIG.headerTitle || "Decision Tree";
const RESET_TREE_CONFIRM = APP_CONFIG.resetConfirmText || "Reset tree to sample flow?";
const API_PATHS = {
  node: "api/tree",
  php: "api/tree.php",
};

const LAYOUT_PRESETS = {
  standard: {
    nodeWidth: 250,
    nodeHeight: 92,
    hGap: 28,
    vGap: 95,
    marginX: 40,
    marginY: 32,
    wrapChars: 29,
    textX: 14,
    textTopY: 26,
    lineHeight: 17,
    fontSize: 14,
  },
  book: {
    nodeWidth: 188,
    nodeHeight: 112,
    hGap: 14,
    vGap: 88,
    marginX: 24,
    marginY: 24,
    wrapChars: 20,
    textX: 11,
    textTopY: 24,
    lineHeight: 15,
    fontSize: 13,
  },
};
const MAX_UNDO_STEPS = 200;
const MAX_SNAPSHOTS = 30;
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.4;
const ZOOM_STEP = 0.15;
const IMPORT_KEY_PARAM = "importKey";
const DEV_TITLE_TAP_TARGET = 4;
const DEV_TITLE_TAP_WINDOW_MS = 1000;
const URL_API = window.URL || window.webkitURL;

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (cb) => window.setTimeout(cb, 16);
}

if (window.Element && !Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}

if (window.Element && !Element.prototype.closest) {
  Element.prototype.closest = function closest(selector) {
    let elNode = this;
    while (elNode && elNode.nodeType === 1) {
      if (elNode.matches && elNode.matches(selector)) return elNode;
      if (elNode.msMatchesSelector && elNode.msMatchesSelector(selector)) return elNode;
      elNode = elNode.parentElement;
    }
    return null;
  };
}

const state = {
  tree: null,
  selectedId: null,
  backendMode: "node",
  layoutMode: "book",
  zoom: 0.9,
  focusMode: false,
  highlightedPathTargetId: null,
  inlineEdit: null,
  snapshots: [],
  boxSelectedNodeIds: new Set(),
  dragSelect: {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  },
  viewportPan: {
    active: false,
    startClientX: 0,
    startClientY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  },
  layout: new Map(),
  subtreeWidths: new Map(),
  undoHistory: [],
  editorWindow: {
    minimized: false,
    dragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    width: 0,
    height: 0,
  },
};

const el = {
  svg: document.getElementById("treeSvg"),
  canvasContainer: document.getElementById("canvasContainer"),
  appTitle: document.getElementById("appTitle"),
  appSubtitle: document.getElementById("appSubtitle"),
  selectedLabel: document.getElementById("selectedLabel"),
  nodeText: document.getElementById("nodeText"),
  nodeTag: document.getElementById("nodeTag"),
  status: document.getElementById("status"),
  uploadJsonInput: document.getElementById("uploadJsonInput"),
  backendModeSelect: document.getElementById("backendModeSelect"),
  layoutModeSelect: document.getElementById("layoutModeSelect"),
  openEditorBtn: document.getElementById("openEditorBtn"),
  openHelpBtn: document.getElementById("openHelpBtn"),
  toggleEditorMinBtn: document.getElementById("toggleEditorMinBtn"),
  closeEditorBtn: document.getElementById("closeEditorBtn"),
  closeHelpBtn: document.getElementById("closeHelpBtn"),
  closeDevBtn: document.getElementById("closeDevBtn"),
  editorModal: document.getElementById("editorModal"),
  editorCard: document.getElementById("editorCard"),
  editorHead: document.getElementById("editorHead"),
  editorBody: document.getElementById("editorBody"),
  helpModal: document.getElementById("helpModal"),
  devModal: document.getElementById("devModal"),
  newTreeFromSelectionBtn: document.getElementById("newTreeFromSelectionBtn"),
  clearSelectionBtn: document.getElementById("clearSelectionBtn"),
  focusBtn: document.getElementById("focusBtn"),
  collapseToggleBtn: document.getElementById("collapseToggleBtn"),
  saveSnapshotBtn: document.getElementById("saveSnapshotBtn"),
  loadSnapshotBtn: document.getElementById("loadSnapshotBtn"),
  zoomOutBtn: document.getElementById("zoomOutBtn"),
  zoomResetBtn: document.getElementById("zoomResetBtn"),
  zoomInBtn: document.getElementById("zoomInBtn"),
  zoomLabel: document.getElementById("zoomLabel"),
  addChildBtn: document.getElementById("addChildBtn"),
  addSiblingBtn: document.getElementById("addSiblingBtn"),
  moveUpBtn: document.getElementById("moveUpBtn"),
  moveDownBtn: document.getElementById("moveDownBtn"),
  deleteAboveBtn: document.getElementById("deleteAboveBtn"),
  deleteBtn: document.getElementById("deleteBtn"),
  resetBtn: document.getElementById("resetBtn"),
  undoBtn: document.getElementById("undoBtn"),
  saveFileBtn: document.getElementById("saveFileBtn"),
  loadSavedBtn: document.getElementById("loadSavedBtn"),
};

function newNode(text = "New step", tag = "decision") {
  return {
    id: `n_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    text,
    tag,
    children: [],
  };
}

function sampleTree() {
  const configured = APP_CONFIG.sampleTree && typeof APP_CONFIG.sampleTree === "object"
    ? APP_CONFIG.sampleTree
    : { id: "root", text: "Start", tag: "decision", children: [] };
  return sanitizeTree(JSON.parse(JSON.stringify(configured)));
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tree));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    state.tree = sanitizeTree(parsed);
    state.selectedId = state.tree.id;
    return true;
  } catch (_err) {
    return false;
  }
}

function getImportKeyFromLocation() {
  const search = window.location && window.location.search ? window.location.search : "";
  if (!search) return "";
  if (window.URLSearchParams) {
    const params = new URLSearchParams(search);
    return params.get(IMPORT_KEY_PARAM) || "";
  }
  const match = search.match(/[?&]importKey=([^&]+)/);
  return match ? decodeURIComponent(match[1].replace(/\+/g, "%20")) : "";
}

function clearImportKeyFromUrl() {
  if (!window.history || !window.history.replaceState) return;
  if (window.URL) {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete(IMPORT_KEY_PARAM);
    window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    return;
  }
  const path = window.location.pathname || "";
  const hash = window.location.hash || "";
  const query = (window.location.search || "").replace(/^\?/, "");
  if (!query) return;
  const kept = query
    .split("&")
    .filter(Boolean)
    .filter((part) => part.split("=")[0] !== IMPORT_KEY_PARAM);
  const nextQuery = kept.length ? `?${kept.join("&")}` : "";
  window.history.replaceState({}, "", `${path}${nextQuery}${hash}`);
}

function loadTreeFromImportKey() {
  const importKey = getImportKeyFromLocation();
  if (!importKey) return false;
  try {
    const raw = localStorage.getItem(importKey);
    if (!raw) {
      clearImportKeyFromUrl();
      return false;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.tree) {
      localStorage.removeItem(importKey);
      clearImportKeyFromUrl();
      return false;
    }

    state.tree = sanitizeTree(parsed.tree);
    state.selectedId = typeof parsed.selectedId === "string" ? parsed.selectedId : state.tree.id;
    if (!findNodeAndParent(state.selectedId)) state.selectedId = state.tree.id;
    saveState();
    localStorage.removeItem(importKey);
    clearImportKeyFromUrl();
    return true;
  } catch (_err) {
    clearImportKeyFromUrl();
    return false;
  }
}

function sanitizeTree(tree) {
  const walk = (node) => {
    const clean = {
      id: node && typeof node.id === "string" && node.id ? node.id : newNode().id,
      text: node && typeof node.text === "string" ? node.text : "Untitled step",
      tag: node && ["decision", "action", "warning"].includes(node.tag) ? node.tag : "decision",
      collapsed: Boolean(node && node.collapsed),
      children: Array.isArray(node && node.children) ? node.children.map(walk) : [],
    };
    return clean;
  };
  return walk(tree);
}

function findNodeAndParent(targetId, current = state.tree, parent = null) {
  if (!current) return null;
  if (current.id === targetId) return { node: current, parent };
  for (const child of current.children) {
    const found = findNodeAndParent(targetId, child, current);
    if (found) return found;
  }
  return null;
}

function findPath(targetId, current = state.tree, path = []) {
  if (!current) return null;
  const nextPath = [...path, current.id];
  if (current.id === targetId) return nextPath;
  for (const child of current.children) {
    const found = findPath(targetId, child, nextPath);
    if (found) return found;
  }
  return null;
}

function getHighlightedPathInfo() {
  const nodeIds = new Set();
  const edgeIds = new Set();
  if (!state.highlightedPathTargetId) return { nodeIds, edgeIds };

  const path = findPath(state.highlightedPathTargetId);
  if (!path) {
    state.highlightedPathTargetId = null;
    return { nodeIds, edgeIds };
  }

  for (let i = 0; i < path.length; i++) {
    nodeIds.add(path[i]);
    if (i > 0) edgeIds.add(`${path[i - 1]}->${path[i]}`);
  }

  return { nodeIds, edgeIds };
}

function cloneTree(node) {
  return sanitizeTree(JSON.parse(JSON.stringify(node)));
}

function getRenderRoot() {
  if (!state.focusMode) return state.tree;
  const found = findNodeAndParent(state.selectedId);
  return found ? found.node : state.tree;
}

function updateFocusButton() {
  if (!el.focusBtn) return;
  el.focusBtn.textContent = state.focusMode ? "Show Full Tree" : "Focus Selected";
}

function updateCollapseButton() {
  if (!el.collapseToggleBtn) return;
  const found = findNodeAndParent(state.selectedId);
  if (!found || found.node.children.length === 0) {
    el.collapseToggleBtn.disabled = true;
    return;
  }
  el.collapseToggleBtn.disabled = false;
  el.collapseToggleBtn.textContent = found.node.collapsed ? "Expand Selected" : "Collapse Selected";
}

function saveSnapshots() {
  localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(state.snapshots));
}

function loadSnapshots() {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
    if (!raw) {
      state.snapshots = [];
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      state.snapshots = [];
      return;
    }
    state.snapshots = parsed
      .filter((s) => s && typeof s === "object" && typeof s.name === "string" && s.tree)
      .map((s) => ({
        id: typeof s.id === "string" ? s.id : `snap_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: s.name,
        createdAt: typeof s.createdAt === "string" ? s.createdAt : new Date().toISOString(),
        selectedId: typeof s.selectedId === "string" ? s.selectedId : "root",
        tree: sanitizeTree(s.tree),
      }));
  } catch (_err) {
    state.snapshots = [];
  }
}

function updateSnapshotButtons() {
  if (el.loadSnapshotBtn) el.loadSnapshotBtn.disabled = state.snapshots.length === 0;
}

function saveSnapshotVersion() {
  const defaultName = `Snapshot ${new Date().toLocaleString()}`;
  const name = window.prompt("Snapshot name:", defaultName);
  if (!name) {
    setStatus("Snapshot canceled.");
    return;
  }

  const snapshot = {
    id: `snap_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    name: name.trim() || defaultName,
    createdAt: new Date().toISOString(),
    selectedId: state.selectedId,
    tree: cloneTree(state.tree),
  };

  state.snapshots.unshift(snapshot);
  if (state.snapshots.length > MAX_SNAPSHOTS) {
    state.snapshots = state.snapshots.slice(0, MAX_SNAPSHOTS);
  }
  saveSnapshots();
  updateSnapshotButtons();
  setStatus("Snapshot saved.");
}

function loadSnapshotVersion() {
  if (state.snapshots.length === 0) {
    setStatus("No snapshots saved yet.");
    return;
  }

  const list = state.snapshots
    .slice(0, 15)
    .map((s, idx) => `${idx + 1}. ${s.name} (${new Date(s.createdAt).toLocaleString()})`)
    .join("\n");
  const choiceRaw = window.prompt(`Load which snapshot? Enter number:\n${list}`, "1");
  if (!choiceRaw) return;
  const choice = Number(choiceRaw);
  if (!Number.isInteger(choice) || choice < 1 || choice > Math.min(15, state.snapshots.length)) {
    setStatus("Invalid snapshot number.");
    return;
  }

  const snapshot = state.snapshots[choice - 1];
  if (!snapshot) return;

  pushUndoSnapshot();
  state.tree = cloneTree(snapshot.tree);
  state.selectedId = snapshot.selectedId;
  if (!findNodeAndParent(state.selectedId)) state.selectedId = state.tree.id;
  state.highlightedPathTargetId = null;
  state.inlineEdit = null;
  state.boxSelectedNodeIds = new Set();
  state.dragSelect.active = false;

  saveState();
  render();
  syncEditor();
  updateBranchButtons();
  updateCollapseButton();
  setStatus(`Loaded snapshot: ${snapshot.name}`);
}

function toggleFocusMode() {
  state.focusMode = !state.focusMode;
  render();
  updateFocusButton();
  setStatus(state.focusMode ? "Focus mode on." : "Focus mode off.");
}

function toggleSelectedCollapse() {
  const found = findNodeAndParent(state.selectedId);
  if (!found || found.node.children.length === 0) {
    setStatus("Selected node has no child branch to collapse.");
    return;
  }
  pushUndoSnapshot();
  found.node.collapsed = !found.node.collapsed;
  saveState();
  render();
  updateCollapseButton();
  setStatus(found.node.collapsed ? "Branch collapsed." : "Branch expanded.");
}

function inlineEditorDomId(nodeId) {
  return `inline_editor_${String(nodeId).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function startInlineEdit(nodeId) {
  const found = findNodeAndParent(nodeId);
  if (!found) return;
  state.selectedId = nodeId;
  state.inlineEdit = {
    nodeId,
    draftText: found.node.text,
  };
  syncEditor();
  render();

  window.requestAnimationFrame(() => {
    const editor = document.getElementById(inlineEditorDomId(nodeId));
    if (!editor) return;
    editor.focus();
    editor.selectionStart = editor.value.length;
    editor.selectionEnd = editor.value.length;
  });
}

function cancelInlineEdit() {
  if (!state.inlineEdit) return;
  state.inlineEdit = null;
  render();
  setStatus("Inline edit canceled.");
}

function commitInlineEdit() {
  if (!state.inlineEdit) return;
  const editing = state.inlineEdit;
  state.inlineEdit = null;

  const found = findNodeAndParent(editing.nodeId);
  if (!found) {
    render();
    return;
  }

  const nextText = editing.draftText;
  const changed = found.node.text !== nextText;
  if (changed) {
    pushUndoSnapshot();
    found.node.text = nextText;
    saveState();
  }

  state.selectedId = editing.nodeId;
  render();
  syncEditor();
  if (changed) setStatus("Node text updated.");
}

function updateBranchButtons() {
  const hasSelection = state.boxSelectedNodeIds.size > 0;
  if (el.newTreeFromSelectionBtn) el.newTreeFromSelectionBtn.disabled = !hasSelection;
  if (el.clearSelectionBtn) el.clearSelectionBtn.disabled = !hasSelection;
}

function getBoxSelectionEdgeIds() {
  const edgeIds = new Set();
  for (const nodeId of state.boxSelectedNodeIds) {
    const found = findNodeAndParent(nodeId);
    if (found && found.parent && state.boxSelectedNodeIds.has(found.parent.id)) {
      edgeIds.add(`${found.parent.id}->${nodeId}`);
    }
  }
  return edgeIds;
}

function getTopMostBoxSelectedNodeId() {
  let bestId = null;
  let bestPos = null;

  for (const nodeId of state.boxSelectedNodeIds) {
    const pos = state.layout.get(nodeId);
    if (!pos) continue;
    if (!bestPos || pos.y < bestPos.y || (pos.y === bestPos.y && pos.x < bestPos.x)) {
      bestPos = pos;
      bestId = nodeId;
    }
  }

  return bestId;
}

function getSelectionRootNodeId() {
  const selectedIds = Array.from(state.boxSelectedNodeIds);
  if (!selectedIds.length) return null;
  if (selectedIds.length === 1) return selectedIds[0];

  const paths = selectedIds
    .map((nodeId) => findPath(nodeId))
    .filter((path) => Array.isArray(path) && path.length > 0);
  if (!paths.length) return null;

  let depth = 0;
  let ancestor = null;
  while (true) {
    const candidate = paths[0][depth];
    if (!candidate) break;
    if (paths.every((path) => path[depth] === candidate)) {
      ancestor = candidate;
      depth += 1;
    } else {
      break;
    }
  }

  return ancestor || getTopMostBoxSelectedNodeId();
}

function getCurrentDragRect() {
  if (!state.dragSelect.active) return null;
  const x = Math.min(state.dragSelect.startX, state.dragSelect.currentX);
  const y = Math.min(state.dragSelect.startY, state.dragSelect.currentY);
  const width = Math.abs(state.dragSelect.currentX - state.dragSelect.startX);
  const height = Math.abs(state.dragSelect.currentY - state.dragSelect.startY);
  return { x, y, width, height };
}

function updateBoxSelectionFromDragRect() {
  const rect = getCurrentDragRect();
  if (!rect) return;
  const p = getLayoutPreset();
  const nextSelection = new Set();

  for (const [nodeId, pos] of state.layout.entries()) {
    const intersects =
      pos.x <= rect.x + rect.width &&
      pos.x + p.nodeWidth >= rect.x &&
      pos.y <= rect.y + rect.height &&
      pos.y + p.nodeHeight >= rect.y;
    if (intersects) nextSelection.add(nodeId);
  }

  state.boxSelectedNodeIds = nextSelection;
  updateBranchButtons();
}

function pruneBoxSelection() {
  if (state.boxSelectedNodeIds.size === 0) return;
  const kept = new Set();
  for (const nodeId of state.boxSelectedNodeIds) {
    if (state.layout.has(nodeId)) kept.add(nodeId);
  }
  if (kept.size !== state.boxSelectedNodeIds.size) {
    state.boxSelectedNodeIds = kept;
    updateBranchButtons();
  }
}

function clearBoxSelection(showMessage = false) {
  if (state.boxSelectedNodeIds.size === 0) return;
  state.boxSelectedNodeIds = new Set();
  updateBranchButtons();
  render();
  if (showMessage) setStatus("Box selection cleared.");
}

function openTreeInNewTab(tree, selectedId = null) {
  if (!window.open) return false;
  const payloadKey = `${APP_KEY}.tabTree.${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const payload = {
    tree,
    selectedId: selectedId || tree.id,
    createdAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(payloadKey, JSON.stringify(payload));
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set(IMPORT_KEY_PARAM, payloadKey);
    const opened = window.open(nextUrl.toString(), "_blank");
    if (opened) return true;
    localStorage.removeItem(payloadKey);
    return false;
  } catch (_err) {
    try {
      localStorage.removeItem(payloadKey);
    } catch (_cleanupErr) {
      // ignore cleanup errors
    }
    return false;
  }
}

function createNewTreeFromNodeId(nodeId, sourceLabel) {
  const found = findNodeAndParent(nodeId);
  if (!found) {
    setStatus("Could not find that branch.");
    return;
  }

  if (!window.confirm(`Create a new tree from this ${sourceLabel} in a new tab?`)) return;

  const nextTree = cloneTree(found.node);
  const opened = openTreeInNewTab(nextTree, nextTree.id);
  if (opened) {
    setStatus("Opened branch as a new tree tab.");
    return;
  }

  pushUndoSnapshot();
  state.tree = nextTree;
  state.selectedId = state.tree.id;
  state.highlightedPathTargetId = null;
  state.boxSelectedNodeIds = new Set();
  state.dragSelect.active = false;
  saveState();
  render();
  syncEditor();
  updateBranchButtons();
  setStatus("Popup blocked. Created new tree in current tab.");
}

function makeNewTreeFromBoxSelection() {
  if (state.boxSelectedNodeIds.size === 0) {
    setStatus("Use Shift + drag or Shift + click to select nodes first.");
    return;
  }

  const rootId = getSelectionRootNodeId();
  if (!rootId) {
    setStatus("Could not resolve a branch root from that selection.");
    return;
  }

  createNewTreeFromNodeId(rootId, "selected branch");
}

function clientToSvgPoint(clientX, clientY) {
  const ctm = el.svg.getScreenCTM();
  if (!ctm) return null;
  const point = el.svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(ctm.inverse());
}

function setStatus(message) {
  el.status.textContent = message;
  if (!message) return;
  window.clearTimeout(setStatus._t);
  setStatus._t = window.setTimeout(() => {
    if (el.status.textContent === message) el.status.textContent = "";
  }, 3200);
}

function setModalVisibility(modalEl, visible) {
  if (!modalEl) return;
  modalEl.hidden = !visible;
  modalEl.setAttribute("aria-hidden", visible ? "false" : "true");
}

function updateEditorMinimizeButton() {
  if (!el.toggleEditorMinBtn) return;
  el.toggleEditorMinBtn.textContent = state.editorWindow.minimized ? "Restore" : "Minimize";
}

function resetEditorWindowPosition() {
  state.editorWindow.dragging = false;
  if (el.editorModal) el.editorModal.classList.remove("editor-floating");
  if (!el.editorCard) return;
  el.editorCard.style.left = "";
  el.editorCard.style.top = "";
}

function clampEditorWindowPosition(left, top) {
  const width = state.editorWindow.width || 320;
  const height = state.editorWindow.height || 140;
  const maxLeft = Math.max(8, window.innerWidth - width - 8);
  const maxTop = Math.max(8, window.innerHeight - height - 8);
  return {
    left: Math.min(maxLeft, Math.max(8, left)),
    top: Math.min(maxTop, Math.max(8, top)),
  };
}

function setEditorMinimized(minimized) {
  state.editorWindow.minimized = Boolean(minimized);
  if (el.editorModal) el.editorModal.classList.toggle("modal-minimized", state.editorWindow.minimized);
  if (el.editorBody) el.editorBody.hidden = state.editorWindow.minimized;
  updateEditorMinimizeButton();
}

function toggleEditorMinimized() {
  setEditorMinimized(!state.editorWindow.minimized);
  if (!state.editorWindow.minimized) {
    window.requestAnimationFrame(() => {
      if (el.nodeText) el.nodeText.focus();
    });
  }
}

function beginEditorDrag(clientX, clientY) {
  if (!el.editorCard || !el.editorModal || el.editorModal.hidden) return;
  const rect = el.editorCard.getBoundingClientRect();
  state.editorWindow.dragging = true;
  state.editorWindow.dragOffsetX = clientX - rect.left;
  state.editorWindow.dragOffsetY = clientY - rect.top;
  state.editorWindow.width = rect.width;
  state.editorWindow.height = rect.height;
  el.editorModal.classList.add("editor-floating");
  el.editorCard.style.left = `${rect.left}px`;
  el.editorCard.style.top = `${rect.top}px`;
}

function moveEditorDrag(clientX, clientY) {
  if (!state.editorWindow.dragging || !el.editorCard) return;
  const targetLeft = clientX - state.editorWindow.dragOffsetX;
  const targetTop = clientY - state.editorWindow.dragOffsetY;
  const clamped = clampEditorWindowPosition(targetLeft, targetTop);
  el.editorCard.style.left = `${clamped.left}px`;
  el.editorCard.style.top = `${clamped.top}px`;
}

function endEditorDrag() {
  state.editorWindow.dragging = false;
}

function startEditorDrag(event) {
  if (event.button !== 0) return;
  const target = event.target;
  if (target && target.closest && target.closest("button, input, textarea, select, a, [data-no-drag]")) {
    return;
  }
  beginEditorDrag(event.clientX, event.clientY);
  event.preventDefault();
}

function openEditorModal() {
  setModalVisibility(el.helpModal, false);
  setModalVisibility(el.editorModal, true);
  setEditorMinimized(false);
  syncEditor();
  window.requestAnimationFrame(() => {
    if (el.nodeText) el.nodeText.focus();
  });
}

function closeEditorModal() {
  setEditorMinimized(false);
  endEditorDrag();
  resetEditorWindowPosition();
  setModalVisibility(el.editorModal, false);
}

function openHelpModal() {
  setModalVisibility(el.editorModal, false);
  setModalVisibility(el.helpModal, true);
}

function closeHelpModal() {
  setModalVisibility(el.helpModal, false);
}

function openDevModal() {
  setModalVisibility(el.editorModal, false);
  setModalVisibility(el.helpModal, false);
  setModalVisibility(el.devModal, true);
}

function closeDevModal() {
  setModalVisibility(el.devModal, false);
}

function closeAllModals() {
  closeEditorModal();
  closeHelpModal();
  closeDevModal();
}

function applyUiConfig() {
  document.title = APP_CONFIG.pageTitle || APP_CONFIG.headerTitle || "Decision Tree";
  if (el.appTitle) el.appTitle.textContent = APP_CONFIG.headerTitle || "Decision Tree";
  if (el.appSubtitle) el.appSubtitle.textContent = APP_CONFIG.headerSubtitle || "Map your process and export it.";
  if (el.nodeText) el.nodeText.placeholder = APP_CONFIG.nodeTextPlaceholder || "Describe this step or decision...";

  const uiLabels = APP_CONFIG.uiLabels || {};
  const tagOptionLabels = { ...DEFAULT_UI_LABELS.tagOptionLabels, ...(uiLabels.tagOptionLabels || {}) };
  if (el.nodeTag) {
    for (const option of el.nodeTag.options) {
      const nextLabel = tagOptionLabels[option.value];
      if (typeof nextLabel === "string" && nextLabel.trim()) option.textContent = nextLabel;
    }
  }

  const controlLabels = { ...DEFAULT_UI_LABELS.controlLabels, ...(uiLabels.controlLabels || {}) };
  for (const [id, text] of Object.entries(controlLabels)) {
    if (typeof text !== "string" || !text.trim()) continue;
    const node = el[id] || document.getElementById(id);
    if (node) node.textContent = text;
  }
}

function clampZoom(value) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

function updateZoomLabel() {
  if (!el.zoomLabel) return;
  el.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
}

function setZoom(nextZoom, announce = true) {
  const clamped = clampZoom(nextZoom);
  if (Math.abs(clamped - state.zoom) < 0.001) return;
  state.zoom = clamped;
  render();
  updateZoomLabel();
  if (announce) setStatus(`Zoom ${Math.round(state.zoom * 100)}%.`);
}

function hasUsableServerApi() {
  return isServerContext() && typeof Promise !== "undefined";
}

function parseMaybeJson(text) {
  try {
    return JSON.parse(text);
  } catch (_err) {
    return null;
  }
}

function apiRequest(method, url, body) {
  if (window.fetch) {
    return fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    }).then(async (response) => {
      const text = await response.text();
      return {
        ok: response.ok,
        status: response.status,
        text,
        json: parseMaybeJson(text),
      };
    });
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      const text = xhr.responseText || "";
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        text,
        json: parseMaybeJson(text),
      });
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(body ? JSON.stringify(body) : null);
  });
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mimePart = parts[0] || "";
  const dataPart = parts[1] || "";
  const mimeMatch = mimePart.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const binary = window.atob(dataPart);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function normalizeBackendMode(value) {
  return value === "php" ? "php" : "node";
}

function normalizeLayoutMode(value) {
  return value === "book" ? "book" : "standard";
}

function getCurrentApiPath() {
  return API_PATHS[state.backendMode] || API_PATHS.node;
}

function getLayoutPreset() {
  return LAYOUT_PRESETS[state.layoutMode] || LAYOUT_PRESETS.standard;
}

function loadBackendMode() {
  const stored = localStorage.getItem(BACKEND_STORAGE_KEY);
  state.backendMode = normalizeBackendMode(stored || "node");
  if (el.backendModeSelect) el.backendModeSelect.value = state.backendMode;
}

function saveBackendMode(mode) {
  state.backendMode = normalizeBackendMode(mode);
  localStorage.setItem(BACKEND_STORAGE_KEY, state.backendMode);
  if (el.backendModeSelect) el.backendModeSelect.value = state.backendMode;
}

function loadLayoutMode() {
  const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
  state.layoutMode = normalizeLayoutMode(stored || "book");
  if (el.layoutModeSelect) el.layoutModeSelect.value = state.layoutMode;
}

function saveLayoutMode(mode) {
  state.layoutMode = normalizeLayoutMode(mode);
  localStorage.setItem(LAYOUT_STORAGE_KEY, state.layoutMode);
  if (el.layoutModeSelect) el.layoutModeSelect.value = state.layoutMode;
}

function isServerContext() {
  return window.location.protocol === "http:" || window.location.protocol === "https:";
}

function updateServerButtons() {
  const enabled = hasUsableServerApi();
  if (el.backendModeSelect) el.backendModeSelect.disabled = !enabled;
  if (el.saveFileBtn) el.saveFileBtn.disabled = !enabled;
  if (el.loadSavedBtn) el.loadSavedBtn.disabled = !enabled;
}

function showCompatibilityNotice() {
  const notes = [];
  if (!window.fetch) notes.push("fetch fallback active");
  if (!window.PointerEvent) notes.push("mouse fallback active");
  if (!window.Promise) notes.push("server save/load disabled (no Promise)");
  if (!URL_API || !URL_API.createObjectURL) notes.push("export/download limits");
  if (!notes.length) return;
  setStatus(`Compatibility mode: ${notes.join(", ")}.`);
}

function updateUndoButton() {
  if (!el.undoBtn) return;
  el.undoBtn.disabled = state.undoHistory.length === 0;
}

function snapshotCurrentState() {
  return {
    treeJson: JSON.stringify(state.tree),
    selectedId: state.selectedId,
  };
}

function pushUndoSnapshot() {
  if (!state.tree) return;
  const snapshot = snapshotCurrentState();
  const last = state.undoHistory[state.undoHistory.length - 1];
  if (last && last.treeJson === snapshot.treeJson && last.selectedId === snapshot.selectedId) {
    return;
  }

  state.undoHistory.push(snapshot);
  if (state.undoHistory.length > MAX_UNDO_STEPS) {
    state.undoHistory.shift();
  }
  updateUndoButton();
}

function undoChange() {
  const snapshot = state.undoHistory.pop();
  if (!snapshot) {
    setStatus("Nothing to undo.");
    updateUndoButton();
    return;
  }

  try {
    state.tree = sanitizeTree(JSON.parse(snapshot.treeJson));
    state.selectedId = snapshot.selectedId;

    if (!findNodeAndParent(state.selectedId)) {
      state.selectedId = state.tree.id;
    }

    saveState();
    render();
    syncEditor();
    updateUndoButton();
    setStatus("Undid last change.");
  } catch (_err) {
    setStatus("Undo failed.");
    updateUndoButton();
  }
}

async function saveToFolderFile() {
  if (!hasUsableServerApi()) {
    setStatus("Run through a web server (Node or PHP) to save to folder.");
    return;
  }

  try {
    const response = await apiRequest("POST", getCurrentApiPath(), state.tree);
    if (!response.ok) {
      throw new Error(`Save failed (${response.status})`);
    }

    setStatus(`Saved to folder JSON via ${state.backendMode.toUpperCase()} backend.`);
  } catch (_err) {
    setStatus(`Could not save via ${state.backendMode.toUpperCase()} backend.`);
  }
}

async function loadSavedFromFolder(showStatus = true) {
  if (!hasUsableServerApi()) {
    if (showStatus) setStatus("Run through a web server (Node or PHP) to load saved file.");
    return false;
  }

  try {
    const response = await apiRequest("GET", getCurrentApiPath());
    if (response.status === 404) return false;
    if (!response.ok) {
      throw new Error(`Load failed (${response.status})`);
    }

    const parsed = response.json || parseMaybeJson(response.text);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid JSON response");
    }
    state.tree = sanitizeTree(parsed);
    state.selectedId = state.tree.id;
    saveState();
    render();
    syncEditor();
    if (showStatus) setStatus(`Loaded saved folder JSON via ${state.backendMode.toUpperCase()} backend.`);
    return true;
  } catch (_err) {
    if (showStatus) setStatus(`Could not load via ${state.backendMode.toUpperCase()} backend.`);
    return false;
  }
}

function wrapText(text, maxChars = 28) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ["(empty)"];

  const lines = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines.slice(0, 5);
}

function computeSubtreeWidth(node) {
  const p = getLayoutPreset();
  if (!node.children.length || node.collapsed) {
    state.subtreeWidths.set(node.id, p.nodeWidth);
    return p.nodeWidth;
  }

  const childrenWidth = node.children
    .map(computeSubtreeWidth)
    .reduce((acc, w) => acc + w, 0) + p.hGap * (node.children.length - 1);

  const width = Math.max(p.nodeWidth, childrenWidth);
  state.subtreeWidths.set(node.id, width);
  return width;
}

function assignLayout(node, leftX, depth) {
  const p = getLayoutPreset();
  const width = state.subtreeWidths.get(node.id);
  const centerX = leftX + width / 2;
  const y = p.marginY + depth * (p.nodeHeight + p.vGap);

  state.layout.set(node.id, {
    x: centerX - p.nodeWidth / 2,
    y,
    cx: centerX,
    top: y,
    bottom: y + p.nodeHeight,
  });

  let cursor = leftX;
  if (node.collapsed) return;
  for (const child of node.children) {
    const childWidth = state.subtreeWidths.get(child.id);
    assignLayout(child, cursor, depth + 1);
    cursor += childWidth + p.hGap;
  }
}

function clearSvg() {
  while (el.svg.firstChild) el.svg.removeChild(el.svg.firstChild);
}

function createSvg(tag, attrs = {}) {
  const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

function drawConnectors(node, g, highlightedEdgeIds, boxEdgeIds) {
  if (node.collapsed) return;
  const pos = state.layout.get(node.id);
  for (const child of node.children) {
    const cPos = state.layout.get(child.id);
    const midY = (pos.bottom + cPos.top) / 2;
    const isHighlighted = highlightedEdgeIds.has(`${node.id}->${child.id}`);
    const isBoxSelected = boxEdgeIds.has(`${node.id}->${child.id}`);
    const stroke = isHighlighted ? "#b12a2a" : isBoxSelected ? "#2d6cb0" : "#8e8375";
    const strokeWidth = isHighlighted || isBoxSelected ? "3" : "1.5";
    const path = createSvg("path", {
      d: `M ${pos.cx} ${pos.bottom} L ${pos.cx} ${midY} L ${cPos.cx} ${midY} L ${cPos.cx} ${cPos.top}`,
      stroke,
      "stroke-width": strokeWidth,
      fill: "none",
    });
    g.appendChild(path);
    drawConnectors(child, g, highlightedEdgeIds, boxEdgeIds);
  }
}

function tagFill(tag) {
  if (tag === "action") return "#f5eadc";
  if (tag === "warning") return "#f4d9d3";
  return "#e9efe5";
}

function drawNodes(node, g, highlightedNodeIds, boxSelectedNodeIds) {
  const p = getLayoutPreset();
  const pos = state.layout.get(node.id);
  const isHighlighted = highlightedNodeIds.has(node.id);
  const isBoxSelected = boxSelectedNodeIds.has(node.id);
  const isSelected = state.selectedId === node.id;
  const isEditing = Boolean(state.inlineEdit && state.inlineEdit.nodeId === node.id);
  let strokeColor = "#72675a";
  if (isHighlighted && isSelected) strokeColor = "#8a1010";
  else if (isHighlighted) strokeColor = "#b12a2a";
  else if (isBoxSelected && isSelected) strokeColor = "#1f4e82";
  else if (isBoxSelected) strokeColor = "#2d6cb0";
  else if (isSelected) strokeColor = "#245b57";
  const strokeWidth = isSelected || isHighlighted || isBoxSelected ? "3" : "1.4";

  const group = createSvg("g", {
    class: "node-group",
    "data-id": node.id,
    transform: `translate(${pos.x},${pos.y})`,
    tabindex: "0",
  });

  const rect = createSvg("rect", {
    width: p.nodeWidth,
    height: p.nodeHeight,
    fill: tagFill(node.tag),
    stroke: strokeColor,
    "stroke-width": strokeWidth,
    rx: "12",
    ry: "12",
  });
  group.appendChild(rect);

  if (node.children.length > 0) {
    const toggleCircle = createSvg("circle", {
      cx: p.nodeWidth - 12,
      cy: 12,
      r: 8,
      fill: "#ffffff",
      stroke: "#7a7267",
      "stroke-width": "1.2",
      cursor: "pointer",
      "data-collapse-toggle": "true",
    });
    const toggleMark = createSvg("text", {
      x: p.nodeWidth - 12,
      y: 16,
      "text-anchor": "middle",
      "font-size": "12",
      fill: "#5f564a",
      "pointer-events": "none",
      "font-family": "Trebuchet MS, Gill Sans, sans-serif",
    });
    toggleMark.textContent = node.collapsed ? "+" : "-";
    group.appendChild(toggleCircle);
    group.appendChild(toggleMark);
  }

  if (isEditing) {
    const editorWrap = createSvg("foreignObject", {
      x: 8,
      y: 8,
      width: p.nodeWidth - 16,
      height: p.nodeHeight - 16,
      "pointer-events": "all",
    });
    const container = document.createElement("div");
    container.setAttribute("data-inline-editor", "true");
    container.className = "inline-editor-wrap";
    const input = document.createElement("textarea");
    input.id = inlineEditorDomId(node.id);
    input.setAttribute("data-inline-node-id", node.id);
    input.className = "inline-editor";
    input.value = state.inlineEdit ? state.inlineEdit.draftText : node.text;

    input.addEventListener("input", () => {
      if (!state.inlineEdit || state.inlineEdit.nodeId !== node.id) return;
      state.inlineEdit.draftText = input.value;
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancelInlineEdit();
        return;
      }
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        event.stopPropagation();
        commitInlineEdit();
      }
    });

    container.appendChild(input);
    editorWrap.appendChild(container);
    group.appendChild(editorWrap);
  } else {
    const lines = wrapText(node.text, p.wrapChars);
    const text = createSvg("text", {
      x: p.textX,
      y: p.textTopY,
      "font-family": "Trebuchet MS, Gill Sans, sans-serif",
      "font-size": String(p.fontSize),
      fill: "#2d2d2d",
    });

    lines.forEach((line, idx) => {
      const tspan = createSvg("tspan", {
        x: p.textX,
        y: p.textTopY + idx * p.lineHeight,
      });
      tspan.textContent = line;
      text.appendChild(tspan);
    });

    group.appendChild(text);
  }

  group.addEventListener("click", (event) => {
    const target = event.target;
    if (target && target.getAttribute && target.getAttribute("data-collapse-toggle") === "true") {
      pushUndoSnapshot();
      node.collapsed = !node.collapsed;
      saveState();
      render();
      updateCollapseButton();
      return;
    }
    if (target && target.closest && target.closest("[data-inline-editor='true']")) return;

    if (event.shiftKey) {
      if (state.boxSelectedNodeIds.has(node.id)) {
        state.boxSelectedNodeIds.delete(node.id);
      } else {
        state.boxSelectedNodeIds.add(node.id);
      }
      state.selectedId = node.id;
      syncEditor();
      updateBranchButtons();
      render();
      updateCollapseButton();
      const count = state.boxSelectedNodeIds.size;
      if (count > 0) {
        const noun = count === 1 ? "node" : "nodes";
        setStatus(`${count} ${noun} selected.`);
      } else {
        setStatus("Selection cleared.");
      }
      return;
    }

    state.selectedId = node.id;
    syncEditor();
    render();
    updateCollapseButton();
  });

  group.addEventListener("dblclick", (event) => {
    event.preventDefault();
    if (event.altKey) {
      state.selectedId = node.id;
      state.highlightedPathTargetId = state.highlightedPathTargetId === node.id ? null : node.id;
      syncEditor();
      render();
      setStatus(state.highlightedPathTargetId ? "Path highlight enabled." : "Path highlight cleared.");
      return;
    }
    startInlineEdit(node.id);
    setStatus("Inline edit: type in node, Ctrl/Cmd+Enter to save, Esc to cancel.");
  });

  group.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    createNewTreeFromNodeId(node.id, "node branch");
  });

  group.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      startInlineEdit(node.id);
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      state.selectedId = node.id;
      syncEditor();
      render();
    }
  });

  g.appendChild(group);
  if (!node.collapsed) {
    for (const child of node.children) drawNodes(child, g, highlightedNodeIds, boxSelectedNodeIds);
  }
}

function drawSelectionOverlay(g) {
  const rect = getCurrentDragRect();
  if (!rect) return;
  const overlay = createSvg("rect", {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    fill: "#2d6cb026",
    stroke: "#2d6cb0",
    "stroke-width": "1.5",
    "stroke-dasharray": "6 5",
    "pointer-events": "none",
  });
  g.appendChild(overlay);
}

function render() {
  if (!state.tree) return;
  const p = getLayoutPreset();
  const renderRoot = getRenderRoot();

  state.layout = new Map();
  state.subtreeWidths = new Map();
  const rootWidth = computeSubtreeWidth(renderRoot);
  assignLayout(renderRoot, p.marginX, 0);
  pruneBoxSelection();

  clearSvg();
  const connectors = createSvg("g");
  const nodes = createSvg("g");
  const overlay = createSvg("g");
  const highlightedPath = getHighlightedPathInfo();
  const boxEdgeIds = getBoxSelectionEdgeIds();

  drawConnectors(renderRoot, connectors, highlightedPath.edgeIds, boxEdgeIds);
  drawNodes(renderRoot, nodes, highlightedPath.nodeIds, state.boxSelectedNodeIds);
  drawSelectionOverlay(overlay);

  el.svg.appendChild(connectors);
  el.svg.appendChild(nodes);
  el.svg.appendChild(overlay);

  const maxDepth = maxTreeDepth(renderRoot);
  const totalWidth = rootWidth + p.marginX * 2;
  const totalHeight = p.marginY * 2 + (maxDepth + 1) * p.nodeHeight + maxDepth * p.vGap;

  el.svg.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
  el.svg.setAttribute("preserveAspectRatio", "xMidYMin meet");
  el.svg.style.width = `${Math.max(520, Math.round(totalWidth * state.zoom))}px`;
  el.svg.style.height = `${Math.max(360, Math.round(totalHeight * state.zoom))}px`;
  updateZoomLabel();
  updateCollapseButton();
  updateFocusButton();
  updateSnapshotButtons();
}

function maxTreeDepth(node, depth = 0) {
  if (!node.children.length || node.collapsed) return depth;
  return Math.max(...node.children.map((c) => maxTreeDepth(c, depth + 1)));
}

function syncEditor() {
  const found = findNodeAndParent(state.selectedId);
  if (!found) return;

  const path = findPath(state.selectedId) || [state.selectedId];
  const crumb = path.join(" > ");
  el.selectedLabel.textContent = crumb;
  el.nodeText.value = found.node.text;
  el.nodeTag.value = found.node.tag;
}

function addChild() {
  const found = findNodeAndParent(state.selectedId);
  if (!found) return;
  pushUndoSnapshot();
  found.node.collapsed = false;
  found.node.children.push(newNode("New fork step", "decision"));
  saveState();
  render();
  setStatus("Fork added.");
}

function addSibling() {
  const found = findNodeAndParent(state.selectedId);
  if (!found || !found.parent) {
    setStatus("Root node cannot have siblings.");
    return;
  }

  const siblings = found.parent.children;
  const idx = siblings.findIndex((s) => s.id === found.node.id);
  const sibling = newNode("Alternative path", "decision");
  pushUndoSnapshot();
  siblings.splice(idx + 1, 0, sibling);
  state.selectedId = sibling.id;
  saveState();
  render();
  syncEditor();
  setStatus("Sibling added.");
}

function deleteNode() {
  const found = findNodeAndParent(state.selectedId);
  if (!found || !found.parent) {
    setStatus("Root node cannot be deleted.");
    return;
  }

  if (!window.confirm("Delete this node and all its child branches?")) return;

  const siblings = found.parent.children;
  pushUndoSnapshot();
  found.parent.children = siblings.filter((s) => s.id !== found.node.id);
  state.selectedId = found.parent.id;
  saveState();
  render();
  syncEditor();
  setStatus("Node deleted.");
}

function deleteAbove() {
  const found = findNodeAndParent(state.selectedId);
  if (!found) return;

  if (!window.confirm("Delete this node and everything above it (toward root)?")) return;

  pushUndoSnapshot();

  const descendants = found.node.children;
  if (descendants.length === 0) {
    state.tree = newNode("New root step", "decision");
    state.selectedId = state.tree.id;
  } else if (descendants.length === 1) {
    state.tree = descendants[0];
    state.selectedId = state.tree.id;
  } else {
    const replacementRoot = newNode("Continue from this branch", "decision");
    replacementRoot.children = descendants;
    state.tree = replacementRoot;
    state.selectedId = replacementRoot.id;
  }

  saveState();
  render();
  syncEditor();
  setStatus("Deleted selected node and everything above it.");
}

function moveSelected(direction) {
  const found = findNodeAndParent(state.selectedId);
  if (!found || !found.parent) {
    setStatus("Root node cannot move.");
    return;
  }

  const siblings = found.parent.children;
  const idx = siblings.findIndex((n) => n.id === found.node.id);
  const swapWith = idx + direction;
  if (swapWith < 0 || swapWith >= siblings.length) {
    setStatus("No more movement in that direction.");
    return;
  }

  pushUndoSnapshot();
  [siblings[idx], siblings[swapWith]] = [siblings[swapWith], siblings[idx]];
  saveState();
  render();
  setStatus("Node moved.");
}

function updateSelectedNode() {
  const found = findNodeAndParent(state.selectedId);
  if (!found) return;
  const nextText = el.nodeText.value;
  const nextTag = el.nodeTag.value;
  if (found.node.text === nextText && found.node.tag === nextTag) return;
  pushUndoSnapshot();
  found.node.text = nextText;
  found.node.tag = nextTag;
  saveState();
  render();
  syncEditor();
}

function resetToSample() {
  if (!window.confirm(RESET_TREE_CONFIRM)) return;
  pushUndoSnapshot();
  state.tree = sampleTree();
  state.selectedId = state.tree.id;
  saveState();
  render();
  syncEditor();
  setStatus("Sample tree restored.");
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(state.tree, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${EXPORT_BASE_NAME}.json`);
  setStatus("JSON downloaded.");
}

function loadJsonFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      pushUndoSnapshot();
      state.tree = sanitizeTree(parsed);
      state.selectedId = state.tree.id;
      saveState();
      render();
      syncEditor();
      setStatus("JSON loaded.");
    } catch (_err) {
      setStatus("Could not parse JSON file.");
    }
  };
  reader.readAsText(file);
}

function serializeSvg(includeXmlDeclaration = false) {
  const clone = el.svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  const serializer = new XMLSerializer();
  const content = serializer.serializeToString(clone);
  return includeXmlDeclaration ? `<?xml version="1.0" standalone="no"?>\n${content}` : content;
}

function exportSvg() {
  const svgText = serializeSvg(true);
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, `${EXPORT_BASE_NAME}.svg`);
  setStatus("SVG exported.");
}

function exportJpg() {
  if (!URL_API || !URL_API.createObjectURL) {
    setStatus("This browser cannot export JPG directly.");
    return;
  }

  const svgText = serializeSvg();
  const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL_API.createObjectURL(svgBlob);
  const img = new Image();

  img.onload = () => {
    try {
      const vb = el.svg.viewBox.baseVal;
      const width = Math.max(1200, Math.floor(vb.width * 1.5));
      const height = Math.max(800, Math.floor(vb.height * 1.5));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      if (canvas.toBlob) {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              setStatus("JPG export failed.");
              return;
            }
            downloadBlob(blob, `${EXPORT_BASE_NAME}.jpg`);
            setStatus("JPG exported.");
          },
          "image/jpeg",
          0.93
        );
      } else {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.93);
        const blob = dataUrlToBlob(dataUrl);
        downloadBlob(blob, `${EXPORT_BASE_NAME}.jpg`);
        setStatus("JPG exported.");
      }
    } finally {
      URL_API.revokeObjectURL(url);
    }
  };

  img.onerror = () => {
    URL_API.revokeObjectURL(url);
    setStatus("Could not render JPG.");
  };

  img.src = url;
}

function printPdf() {
  const svgText = serializeSvg();
  const printWin = window.open("", "_blank");
  if (!printWin) {
    setStatus("Popup blocked. Allow popups to print PDF.");
    return;
  }

  printWin.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${PRINT_TITLE}</title>
        <style>
          body { margin: 0; padding: 16px; font-family: sans-serif; background: #fff; }
          h1 { font-size: 18px; margin: 0 0 12px; }
          .wrap { border: 1px solid #ccc; padding: 8px; }
          svg { width: 100%; height: auto; }
          @media print {
            body { padding: 0; }
            .wrap { border: none; }
          }
        </style>
      </head>
      <body>
        <h1>${PRINT_TITLE}</h1>
        <div class="wrap">${svgText}</div>
      </body>
    </html>
  `);
  printWin.document.close();
  printWin.focus();
  printWin.print();
  setStatus("Opened print dialog (choose Save as PDF).");
}

function downloadBlob(blob, filename) {
  if (window.navigator && window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(blob, filename);
    return;
  }
  if (!URL_API || !URL_API.createObjectURL) {
    setStatus("This browser cannot download files automatically.");
    return;
  }
  const url = URL_API.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL_API.revokeObjectURL(url);
}

function fitView() {
  const container = el.canvasContainer;
  container.scrollTo({ top: 0, left: 0, behavior: "smooth" });
}

function shouldStartViewportPan(event) {
  if (!el.canvasContainer || event.button !== 0 || event.shiftKey || state.inlineEdit) return false;
  const target = event.target;
  if (!target || !target.closest) return false;
  if (!target.closest("#treeSvg")) return false;
  return !target.closest(".node-group, [data-inline-editor='true']");
}

function startViewportPan(event) {
  if (!shouldStartViewportPan(event)) return;
  state.viewportPan.active = true;
  state.viewportPan.startClientX = event.clientX;
  state.viewportPan.startClientY = event.clientY;
  state.viewportPan.startScrollLeft = el.canvasContainer.scrollLeft;
  state.viewportPan.startScrollTop = el.canvasContainer.scrollTop;
  el.canvasContainer.classList.add("is-panning");
  event.preventDefault();
  event.stopPropagation();
}

function moveViewportPan(clientX, clientY) {
  if (!state.viewportPan.active || !el.canvasContainer) return;
  const dx = clientX - state.viewportPan.startClientX;
  const dy = clientY - state.viewportPan.startClientY;
  el.canvasContainer.scrollLeft = state.viewportPan.startScrollLeft - dx;
  el.canvasContainer.scrollTop = state.viewportPan.startScrollTop - dy;
}

function endViewportPan() {
  if (!state.viewportPan.active || !el.canvasContainer) return;
  state.viewportPan.active = false;
  el.canvasContainer.classList.remove("is-panning");
}

function startDragSelection(event) {
  if (state.viewportPan.active) return;
  if (state.inlineEdit) return;
  if (event.button !== 0 || !event.shiftKey) return;
  const point = clientToSvgPoint(event.clientX, event.clientY);
  if (!point) return;

  state.dragSelect.active = true;
  state.dragSelect.startX = point.x;
  state.dragSelect.startY = point.y;
  state.dragSelect.currentX = point.x;
  state.dragSelect.currentY = point.y;
  state.boxSelectedNodeIds = new Set();
  updateBranchButtons();
  render();
  event.preventDefault();
}

function moveDragSelection(event) {
  if (!state.dragSelect.active) return;
  const point = clientToSvgPoint(event.clientX, event.clientY);
  if (!point) return;

  state.dragSelect.currentX = point.x;
  state.dragSelect.currentY = point.y;
  updateBoxSelectionFromDragRect();
  render();
  event.preventDefault();
}

function endDragSelection(event) {
  if (!state.dragSelect.active) return;
  const point = clientToSvgPoint(event.clientX, event.clientY);
  if (point) {
    state.dragSelect.currentX = point.x;
    state.dragSelect.currentY = point.y;
    updateBoxSelectionFromDragRect();
  }
  state.dragSelect.active = false;
  render();

  if (state.boxSelectedNodeIds.size > 0) {
    const noun = state.boxSelectedNodeIds.size === 1 ? "node" : "nodes";
    setStatus(`${state.boxSelectedNodeIds.size} ${noun} selected. Click New Tree from Selection.`);
  } else {
    setStatus("No branch found in box selection.");
  }
  event.preventDefault();
}

function wireEvents() {
  el.nodeText.addEventListener("input", updateSelectedNode);
  el.nodeTag.addEventListener("change", updateSelectedNode);
  el.openEditorBtn.addEventListener("click", openEditorModal);
  el.openHelpBtn.addEventListener("click", openHelpModal);
  el.toggleEditorMinBtn.addEventListener("click", toggleEditorMinimized);
  el.closeEditorBtn.addEventListener("click", closeEditorModal);
  el.closeHelpBtn.addEventListener("click", closeHelpModal);
  el.closeDevBtn.addEventListener("click", closeDevModal);
  el.editorModal.addEventListener("click", (event) => {
    const closeKey = event.target && event.target.getAttribute && event.target.getAttribute("data-close-modal");
    if (closeKey === "editor") closeEditorModal();
  });
  el.helpModal.addEventListener("click", (event) => {
    const closeKey = event.target && event.target.getAttribute && event.target.getAttribute("data-close-modal");
    if (closeKey === "help") closeHelpModal();
  });
  el.devModal.addEventListener("click", (event) => {
    const closeKey = event.target && event.target.getAttribute && event.target.getAttribute("data-close-modal");
    if (closeKey === "dev") closeDevModal();
  });

  if (el.appTitle) {
    let titleTapCount = 0;
    let resetTapTimer = 0;
    el.appTitle.addEventListener("click", () => {
      titleTapCount += 1;
      window.clearTimeout(resetTapTimer);
      if (titleTapCount >= DEV_TITLE_TAP_TARGET) {
        titleTapCount = 0;
        openDevModal();
        setStatus("Developer tools opened.");
        return;
      }
      resetTapTimer = window.setTimeout(() => {
        titleTapCount = 0;
      }, DEV_TITLE_TAP_WINDOW_MS);
    });
  }

  el.backendModeSelect.addEventListener("change", (event) => {
    saveBackendMode(event.target.value);
    setStatus(`Backend switched to ${state.backendMode.toUpperCase()}.`);
  });
  el.layoutModeSelect.addEventListener("change", (event) => {
    saveLayoutMode(event.target.value);
    render();
    setStatus(`Width mode set to ${state.layoutMode.toUpperCase()}.`);
  });
  el.focusBtn.addEventListener("click", toggleFocusMode);
  el.collapseToggleBtn.addEventListener("click", toggleSelectedCollapse);
  el.saveSnapshotBtn.addEventListener("click", saveSnapshotVersion);
  el.loadSnapshotBtn.addEventListener("click", loadSnapshotVersion);
  el.zoomOutBtn.addEventListener("click", () => setZoom(state.zoom - ZOOM_STEP));
  el.zoomResetBtn.addEventListener("click", () => setZoom(1));
  el.zoomInBtn.addEventListener("click", () => setZoom(state.zoom + ZOOM_STEP));
  el.newTreeFromSelectionBtn.addEventListener("click", makeNewTreeFromBoxSelection);
  el.clearSelectionBtn.addEventListener("click", () => clearBoxSelection(true));

  document.getElementById("undoBtn").addEventListener("click", undoChange);
  document.getElementById("saveFileBtn").addEventListener("click", saveToFolderFile);
  document.getElementById("loadSavedBtn").addEventListener("click", () => loadSavedFromFolder(true));
  document.getElementById("addChildBtn").addEventListener("click", addChild);
  document.getElementById("addSiblingBtn").addEventListener("click", addSibling);
  document.getElementById("deleteAboveBtn").addEventListener("click", deleteAbove);
  document.getElementById("deleteBtn").addEventListener("click", deleteNode);
  document.getElementById("moveUpBtn").addEventListener("click", () => moveSelected(-1));
  document.getElementById("moveDownBtn").addEventListener("click", () => moveSelected(1));
  document.getElementById("resetBtn").addEventListener("click", resetToSample);

  document.getElementById("downloadJsonBtn").addEventListener("click", downloadJson);
  document.getElementById("exportSvgBtn").addEventListener("click", exportSvg);
  document.getElementById("exportJpgBtn").addEventListener("click", exportJpg);
  document.getElementById("printPdfBtn").addEventListener("click", printPdf);
  document.getElementById("fitBtn").addEventListener("click", fitView);

  el.uploadJsonInput.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) loadJsonFromFile(file);
    event.target.value = "";
  });

  const maybeCommitInlineEdit = (event) => {
    if (!state.inlineEdit) return;
    const target = event.target;
    if (target && target.closest && target.closest("[data-inline-editor='true']")) return;
    commitInlineEdit();
  };
  document.addEventListener("pointerdown", maybeCommitInlineEdit);
  document.addEventListener("mousedown", maybeCommitInlineEdit);

  if (window.PointerEvent) {
    el.editorHead.addEventListener("pointerdown", startEditorDrag);
    window.addEventListener("pointermove", (event) => moveEditorDrag(event.clientX, event.clientY));
    window.addEventListener("pointerup", endEditorDrag);
    window.addEventListener("pointercancel", endEditorDrag);
    el.canvasContainer.addEventListener("pointerdown", startViewportPan, true);
    window.addEventListener("pointermove", (event) => moveViewportPan(event.clientX, event.clientY));
    window.addEventListener("pointerup", endViewportPan);
    window.addEventListener("pointercancel", endViewportPan);
  } else {
    el.editorHead.addEventListener("mousedown", startEditorDrag);
    window.addEventListener("mousemove", (event) => moveEditorDrag(event.clientX, event.clientY));
    window.addEventListener("mouseup", endEditorDrag);
    el.canvasContainer.addEventListener("mousedown", startViewportPan, true);
    window.addEventListener("mousemove", (event) => moveViewportPan(event.clientX, event.clientY));
    window.addEventListener("mouseup", endViewportPan);
  }

  if (window.PointerEvent) {
    el.svg.addEventListener("pointerdown", startDragSelection);
    el.svg.addEventListener("pointermove", moveDragSelection);
    window.addEventListener("pointerup", endDragSelection);
  } else {
    el.svg.addEventListener("mousedown", startDragSelection);
    el.svg.addEventListener("mousemove", moveDragSelection);
    window.addEventListener("mouseup", endDragSelection);
  }

  document.addEventListener("keydown", (event) => {
    const modifier = event.ctrlKey || event.metaKey;
    const undoKey = modifier && !event.shiftKey && event.key.toLowerCase() === "z";
    const zoomInKey = modifier && (event.key === "+" || event.key === "=");
    const zoomOutKey = modifier && event.key === "-";
    const zoomResetKey = modifier && event.key === "0";
    const openDevKey = event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d";
    if (event.key === "Escape") {
      if (state.inlineEdit) {
        cancelInlineEdit();
        return;
      }
      if (
        (el.editorModal && !el.editorModal.hidden) ||
        (el.helpModal && !el.helpModal.hidden) ||
        (el.devModal && !el.devModal.hidden)
      ) {
        closeAllModals();
      }
      return;
    }
    const target = event.target;
    const isInputTarget = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
    if (isInputTarget) return;
    if (openDevKey) {
      event.preventDefault();
      openDevModal();
      setStatus("Developer tools opened.");
      return;
    }
    if (undoKey) {
      event.preventDefault();
      undoChange();
      return;
    }
    if (zoomInKey) {
      event.preventDefault();
      setZoom(state.zoom + ZOOM_STEP, false);
      return;
    }
    if (zoomOutKey) {
      event.preventDefault();
      setZoom(state.zoom - ZOOM_STEP, false);
      return;
    }
    if (zoomResetKey) {
      event.preventDefault();
      setZoom(1, false);
    }
  });
}

function init() {
  applyUiConfig();
  loadBackendMode();
  loadLayoutMode();
  loadSnapshots();
  wireEvents();
  updateServerButtons();
  const loadedFromImport = loadTreeFromImportKey();
  if (!loadedFromImport && !loadState()) {
    state.tree = sampleTree();
    state.selectedId = state.tree.id;
    saveState();
  }

  render();
  syncEditor();
  updateUndoButton();
  updateBranchButtons();
  updateFocusButton();
  updateCollapseButton();
  updateSnapshotButtons();
  updateZoomLabel();
  updateEditorMinimizeButton();
  showCompatibilityNotice();
}

init();
