window.__Caliper = window.__Caliper || {
  state: {
    active: false,
    hovered: null,
    selected: null,
    // Free ruler (drag-anywhere) state.
    // ruler is the rendered measurement: {x1, y1, x2, y2} in document coords,
    // null when nothing is drawn. dragStart/dragging track the in-progress
    // gesture between mousedown and mouseup so we can disambiguate click
    // (small movement -> select element) from drag (-> draw a ruler).
    ruler: null,
    dragStart: null,
    dragging: false,
  },
  shadow: null,
  hostEl: null,
  layers: null,
};
