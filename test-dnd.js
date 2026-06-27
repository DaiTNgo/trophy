function getReorderDestinationIndex({ startIndex, indexOfTarget, closestEdgeOfTarget }) {
  if (startIndex === indexOfTarget) return startIndex;
  if (startIndex < indexOfTarget) {
    if (closestEdgeOfTarget === 'top' || closestEdgeOfTarget === 'left') {
      return indexOfTarget - 1;
    }
    return indexOfTarget;
  }
  if (startIndex > indexOfTarget) {
    if (closestEdgeOfTarget === 'top' || closestEdgeOfTarget === 'left') {
      return indexOfTarget;
    }
    return indexOfTarget + 1;
  }
  return startIndex;
}

const cases = [
  { start: 1, target: 0, edge: 'top' },
  { start: 1, target: 2, edge: 'bottom' },
  { start: 0, target: 1, edge: 'top' },
  { start: 0, target: 1, edge: 'bottom' },
];

cases.forEach(c => {
  const pos = getReorderDestinationIndex({ startIndex: c.start, indexOfTarget: c.target, closestEdgeOfTarget: c.edge });
  console.log(`start: ${c.start}, target: ${c.target}, edge: ${c.edge} -> pos: ${pos}, hidden: ${pos === c.start}`);
});
