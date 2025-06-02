import { Data, Layout } from "plotly.js";
import { useMemo } from "react";
import Plot from "react-plotly.js";
import { scoreGuess } from "../convex/validation";

export type CalibrationData = { prob: number; actual: boolean };

export const CalibrationPlot = ({
  data,
  title,
}: {
  data: CalibrationData[];
  title: string;
}) => {
  const plotData = useMemo((): { traces: Data[]; layout: Partial<Layout> } => {
    // Sort data by probability
    const sortedData = [...data].sort((a, b) => a.prob - b.prob);

    // Create cumulative data points
    const cumulativeData: {
      prob: number;
      cumScore: number;
      cumProb: number;
      cumActual: number;
    }[] = [{ prob: 0, cumScore: 0, cumProb: 0, cumActual: 0 }];
    let cumProb = 0;
    let cumScore = 0;
    let cumActual = 0;

    sortedData.forEach((d) => {
      cumProb += d.prob;
      if (d.actual) cumActual += 1;
      cumScore += scoreGuess(d.prob, d.actual);

      cumulativeData.push({
        prob: d.prob,
        cumScore: cumScore,
        cumProb: cumProb,
        cumActual: cumActual,
      });
    });
    cumulativeData.push({
      prob: 1,
      cumScore: cumulativeData[cumulativeData.length - 1].cumScore,
      cumProb: 1,
      cumActual: cumulativeData[cumulativeData.length - 1].cumActual,
    });

    const traces: Data[] = [
      {
        x: cumulativeData.map((d) => d.prob),
        y: cumulativeData.map((d) => d.cumScore),
        name: "Cumulative Score",
        type: "scatter",
        mode: "lines",
        "line.shape": "hv",
        line: { color: "#2563eb", width: 2, shape: "hv" },
        fill: "tozeroy",
        hovertemplate: "Probability: %{x:.2f}",
      },
      // {
      //   x: cumulativeData.map((d) => d.prob),
      //   y: cumulativeData.map((d) => d.cumActual),
      //   name: "Cumulative Actuals",
      //   type: "scatter",
      //   mode: "lines",
      //   line: { color: "#dc2626", width: 2 },
      //   hovertemplate:
      //     "Probability: %{x:.2f}<br>Cumulative Actual: %{y:.2f}<extra></extra>",
      // },
    ];

    const layout: Partial<Layout> = {
      title: {
        text: title,
        font: { size: 16, weight: 700 },
      },
      xaxis: {
        title: {
          text: "Probability",
          font: { size: 16, weight: 700 },
        },
        range: [0, 1],
        showgrid: true,
        zeroline: true,
      },
      yaxis: {
        title: {
          text: "Cumulative Count",
          font: { size: 16, weight: 700 },
        },
        showgrid: true,
        zeroline: true,
      },
      margin: { t: 40, r: 80, b: 50, l: 60 },
      // showlegend: true,
      // legend: {
      //   x: 0.85,
      //   y: 1.05,
      //   bgcolor: "rgba(255, 255, 255, 0.8)",
      // },
      hovermode: "closest" as const,
      width: 600,
      height: 400,
    };

    return { traces, layout };
  }, [data, title]);

  return (
    <div className="p-4">
      <Plot
        data={plotData.traces}
        layout={plotData.layout}
        config={{
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ["lasso2d", "select2d"],
        }}
        className="border border-gray-300"
      />
    </div>
  );
};
