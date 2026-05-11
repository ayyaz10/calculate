import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getGoalType, metricColors } from './progressTrackerStorage';
import {
  formatTrackerNumber,
  getPrimaryMetric,
  isBinaryEntryCompleted,
} from './progressCalculations';

function ChartTooltip({ active, label, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-[1rem] border-2 border-black bg-[#fffdf8] px-4 py-3 shadow-[4px_4px_0_#000]">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/55">
        {label}
      </p>
      <div className="mt-2 space-y-1">
        {payload.map((item) => (
          <p
            key={item.dataKey}
            className="text-sm font-bold text-black"
            style={{ color: item.color }}
          >
            {item.name}: {formatTrackerNumber(item.value)}
          </p>
        ))}
      </div>
    </div>
  );
}

function BinaryHeatmap({ goal, entries }) {
  const sortedEntries = [...entries].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return (
    <div className="mt-5 rounded-[1.5rem] border-2 border-black bg-[#fffdf8] p-4">
      {sortedEntries.length === 0 ? (
        <div className="flex min-h-72 items-center justify-center text-center">
          <p className="max-w-sm text-lg font-bold leading-7 tracking-[-0.03em] text-black/65">
            Save your first daily entry to draw the consistency calendar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 md:grid-cols-10 lg:grid-cols-12">
          {sortedEntries.map((entry) => {
            const completed = isBinaryEntryCompleted(entry, goal);

            return (
              <div
                key={entry.id}
                className="aspect-square rounded-[0.75rem] border-2 border-black p-2"
                style={{ backgroundColor: completed ? '#c5ff6f' : '#ffe0de' }}
                title={`${entry.date}: ${completed ? 'Completed' : 'Missed'}`}
              >
                <p className="text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-black/55">
                  {entry.date.slice(5)}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-black">
                  {completed ? 'Done' : 'Miss'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function GoalChart({ goal, entries }) {
  if (!goal) {
    return null;
  }

  const goalType = getGoalType(goal);
  const mainMetric = getPrimaryMetric(goal);
  const sortedEntries = [...entries].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  let cumulativeTotal = Number.isFinite(goal.startValue) ? goal.startValue : 0;
  const chartData = sortedEntries.map((entry) => {
    const point = {
      date: entry.date,
    };

    if (goalType === 'accumulative') {
      const dailyActivity = entry.values?.[mainMetric?.id];
      cumulativeTotal += Number.isFinite(dailyActivity) ? dailyActivity : 0;
      point.dailyActivity = dailyActivity;
      point.cumulativeTotal = cumulativeTotal;
    } else {
      goal.metrics.forEach((metric) => {
        point[`metric_${metric.id}`] = entry.values?.[metric.id];
      });
    }

    return point;
  });
  const title =
    goalType === 'accumulative'
      ? 'Completion progress'
      : goalType === 'binary'
      ? 'Consistency calendar'
      : 'Metric movement';
  const badge =
    goalType === 'accumulative'
      ? 'Cumulative'
      : goalType === 'binary'
      ? 'Calendar'
      : `${goal.metrics.length} line${goal.metrics.length === 1 ? '' : 's'}`;

  return (
    <section className="rounded-[1.75rem] border-2 border-black bg-[#f8f3ea] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/55">
            Graph
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-black">
            {title}
          </h2>
        </div>
        <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-black">
          {badge}
        </span>
      </div>

      {goalType === 'binary' ? (
        <BinaryHeatmap goal={goal} entries={entries} />
      ) : chartData.length === 0 ? (
        <div className="mt-5 flex min-h-72 items-center justify-center rounded-[1.5rem] border-2 border-dashed border-black bg-[#fffdf8] p-6 text-center">
          <p className="max-w-sm text-lg font-bold leading-7 tracking-[-0.03em] text-black/65">
            Save your first daily entry to draw the chart.
          </p>
        </div>
      ) : (
        <div className="mt-5 h-80 rounded-[1.5rem] border-2 border-black bg-[#fffdf8] p-3 sm:h-96 sm:p-4">
          <ResponsiveContainer width="100%" height="100%">
            {goalType === 'accumulative' ? (
              <ComposedChart
                data={chartData}
                margin={{ top: 14, right: 18, bottom: 4, left: 0 }}
              >
                <CartesianGrid
                  stroke="#000"
                  strokeDasharray="4 6"
                  strokeOpacity={0.15}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#000', fontSize: 12, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={{ stroke: '#000', strokeWidth: 2 }}
                />
                <YAxis
                  tick={{ fill: '#000', fontSize: 12, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={{ stroke: '#000', strokeWidth: 2 }}
                  width={48}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                  }}
                />
                {Number.isFinite(goal.targetValue) && goal.targetValue > 0 ? (
                  <ReferenceLine
                    y={goal.targetValue}
                    stroke="#000"
                    strokeDasharray="8 6"
                    strokeWidth={2}
                    label={{
                      value: `Target ${goal.targetValue}`,
                      fill: '#000',
                      fontSize: 12,
                      fontWeight: 800,
                      position: 'insideTopRight',
                    }}
                  />
                ) : null}
                <Bar
                  dataKey="dailyActivity"
                  name="Daily activity"
                  fill={metricColors[mainMetric?.colorKey] || '#38bdf8'}
                  stroke="#000"
                  strokeWidth={2}
                  radius={[8, 8, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeTotal"
                  name="Cumulative total"
                  stroke="#000"
                  strokeWidth={4}
                  dot={{
                    r: 4,
                    stroke: '#000',
                    strokeWidth: 2,
                    fill: '#c5ff6f',
                  }}
                  activeDot={{
                    r: 7,
                    stroke: '#000',
                    strokeWidth: 2,
                    fill: '#c5ff6f',
                  }}
                  connectNulls
                />
              </ComposedChart>
            ) : (
              <LineChart
                data={chartData}
                margin={{ top: 14, right: 18, bottom: 4, left: 0 }}
              >
                <CartesianGrid
                  stroke="#000"
                  strokeDasharray="4 6"
                  strokeOpacity={0.15}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#000', fontSize: 12, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={{ stroke: '#000', strokeWidth: 2 }}
                />
                <YAxis
                  tick={{ fill: '#000', fontSize: 12, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={{ stroke: '#000', strokeWidth: 2 }}
                  width={48}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                  }}
                />
                {Number.isFinite(goal.targetValue) && goal.targetValue > 0 ? (
                  <ReferenceLine
                    y={goal.targetValue}
                    stroke="#000"
                    strokeDasharray="8 6"
                    strokeWidth={2}
                    label={{
                      value: `Target ${goal.targetValue}`,
                      fill: '#000',
                      fontSize: 12,
                      fontWeight: 800,
                      position: 'insideTopRight',
                    }}
                  />
                ) : null}
                {goal.metrics.map((metric) => (
                  <Line
                    key={metric.id}
                    type="monotone"
                    dataKey={`metric_${metric.id}`}
                    name={metric.name}
                    stroke={metricColors[metric.colorKey] || '#000'}
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      stroke: '#000',
                      strokeWidth: 2,
                      fill: metricColors[metric.colorKey] || '#fff',
                    }}
                    activeDot={{
                      r: 7,
                      stroke: '#000',
                      strokeWidth: 2,
                      fill: metricColors[metric.colorKey] || '#fff',
                    }}
                    connectNulls
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
