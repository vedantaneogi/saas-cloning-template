import type { EditorState, EditorAction } from "../model/types";

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "ADD_FIELD": {
      const newFields = [...state.fields, action.field];
      return {
        ...state,
        fields: newFields,
        selectedFieldId: action.field.id,
        activeTool: "select",
        // push undo snapshot
        _past: [...(state._past ?? []), state.fields],
        _future: [],
      };
    }

    case "UPDATE_FIELD": {
      const newFields = state.fields.map((f) =>
        f.id === action.id ? { ...f, ...action.updates } : f,
      );
      return {
        ...state,
        fields: newFields,
        _past: [...(state._past ?? []), state.fields],
        _future: [],
      };
    }

    case "REMOVE_FIELD": {
      const newFields = state.fields.filter((f) => f.id !== action.id);
      return {
        ...state,
        fields: newFields,
        selectedFieldId: state.selectedFieldId === action.id ? null : state.selectedFieldId,
        _past: [...(state._past ?? []), state.fields],
        _future: [],
      };
    }

    case "SELECT_FIELD":
      return { ...state, selectedFieldId: action.id };

    case "SET_ACTIVE_RECIPIENT":
      return { ...state, activeRecipientId: action.id };

    case "SET_PAGE":
      return { ...state, currentPage: action.page };

    case "SET_FIELDS":
      return { ...state, fields: action.fields, _past: [], _future: [] };

    case "SET_ZOOM":
      return { ...state, zoom: Math.max(0.25, Math.min(3, action.zoom)) };

    case "SET_TOOL":
      return { ...state, activeTool: action.tool, selectedFieldId: null };

    case "UNDO": {
      const past = state._past ?? [];
      if (past.length === 0) return state;
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      return {
        ...state,
        fields: previous,
        selectedFieldId: null,
        _past: newPast,
        _future: [state.fields, ...(state._future ?? [])],
      };
    }

    case "REDO": {
      const future = state._future ?? [];
      if (future.length === 0) return state;
      const next = future[0];
      const newFuture = future.slice(1);
      return {
        ...state,
        fields: next,
        selectedFieldId: null,
        _past: [...(state._past ?? []), state.fields],
        _future: newFuture,
      };
    }

    default:
      return state;
  }
}
