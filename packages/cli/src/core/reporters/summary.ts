export function formatMarkdownSummary(markdownReport: string, maxRows = 5): string {
  const lines = markdownReport.split('\n');
  const filtered = lines.filter((line, index) => !(index === 0 && line.startsWith('<!--')));
  const result: string[] = [];

  for (let index = 0; index < filtered.length; index += 1) {
    const line = filtered[index];
    if (line.startsWith('|------')) {
      result.push(line);
      const dataRows: string[] = [];
      let dataIndex = index + 1;
      while (dataIndex < filtered.length) {
        const row = filtered[dataIndex];
        if (!row.startsWith('|')) {
          break;
        }
        dataRows.push(row);
        dataIndex += 1;
      }
      const visibleRows = dataRows.slice(0, maxRows);
      result.push(...visibleRows);
      if (dataRows.length > maxRows) {
        const remaining = dataRows.length - maxRows;
        result.push(`| … | … | … | … | … (${remaining} more) |`);
      }
      index = dataIndex - 1;
      continue;
    }

    if (line.startsWith('<!--')) {
      continue;
    }

    result.push(line);
  }

  return result.join('\n').trimEnd();
}
