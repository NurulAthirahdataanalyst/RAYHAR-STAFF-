with open('src/pages/outstation/OutstationAnalytics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_state = "  const [recentLimit, setRecentLimit] = useState(10);"
new_state = """  const [recentLimit, setRecentLimit] = useState(10);
  const [destinationLimit, setDestinationLimit] = useState(5);"""
content = content.replace(old_state, new_state)

old_dest = """  const destinationData = useMemo(() => {
    const counts: Record<string, number> = {};
    assignments.forEach(a => {
      const destination = a.destination || "Unknown";
      counts[destination] = (counts[destination] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([destination, count]) => ({ destination, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredAssignments]);"""

new_dest = """  const destinationData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAssignments.forEach(a => {
      const destination = a.destination || "Unknown";
      counts[destination] = (counts[destination] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([destination, count]) => ({ destination, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredAssignments]);"""
content = content.replace(old_dest, new_dest)

with open('src/pages/outstation/OutstationAnalytics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)