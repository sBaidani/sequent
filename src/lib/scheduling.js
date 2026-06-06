export function calculateGridOverlap(items) {
  // Items must have startMin and endMin properties
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  
  const clusters = [];
  let currentCluster = [];
  let currentClusterEnd = -1;

  for (const item of sorted) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      currentClusterEnd = item.endMin;
    } else {
      if (item.startMin < currentClusterEnd) {
        currentCluster.push(item);
        currentClusterEnd = Math.max(currentClusterEnd, item.endMin);
      } else {
        clusters.push(currentCluster);
        currentCluster = [item];
        currentClusterEnd = item.endMin;
      }
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const result = [];
  
  for (const cluster of clusters) {
    if (cluster.length === 1) {
      result.push({ ...cluster[0], left: '48px', width: 'calc(100% - 52px)' });
    } else if (cluster.length === 2) {
      result.push({ ...cluster[0], left: '48px', width: 'calc(50% - 28px)' });
      result.push({ ...cluster[1], left: 'calc(50% + 24px)', width: 'calc(50% - 28px)' });
    } else {
      const startMin = cluster[0].startMin;
      const endMin = Math.max(...cluster.map(c => c.endMin));
      result.push({
        isGroup: true,
        startMin,
        endMin,
        items: cluster,
        left: '48px',
        width: 'calc(100% - 52px)'
      });
    }
  }
  
  return result;
}
