import { Data, Layout } from "plotly.js";
import { useMemo } from "react";
import Plot from "react-plotly.js";
import { scoreGuess } from "../convex/validation";
import { formatPlusMinusInt, formatProbabilityAsPercentage } from "./lib/utils";
import { List } from "immutable";

export type CalibrationData = {
  prob: number;
  question: { text: string; left: string; right: string; answer: boolean };
};

export const CalibrationPlot = ({
  data,
  title,
}: {
  data: CalibrationData[];
  title: string;
}) => {
  const plotData = useMemo((): { traces: Data[]; layout: Partial<Layout> } => {
    const x: number[] = [50];
    const y: number[] = [0];
    const texts: string[] = [""];
    for (const d of List(data).sortBy((d) => Math.abs(d.prob - 0.5))) {
      const xVal = 100 * (d.prob < 0.5 ? 1 - d.prob : d.prob);
      const [rightAnswer, wrongAnswer] = d.question.answer
        ? [d.question.right, d.question.left]
        : [d.question.left, d.question.right];
      const score = scoreGuess(d.prob, d.question.answer);
      const text = `Q. ${d.question.text}<br>A. ${rightAnswer} (vs ${wrongAnswer})<br>You gave ${rightAnswer}: ${formatProbabilityAsPercentage(d.prob)} (${formatPlusMinusInt(score)}pt)`;
      if (xVal === x[x.length - 1]) {
        y[y.length - 1] += score;
        texts[texts.length - 1] += `<br><br>${text}`;
      } else {
        x.push(xVal);
        y.push(y[y.length - 1] + score);
        texts.push(text);
      }
    }
    x.push(1);
    y.push(y[y.length - 1]);
    texts.push("");
    console.log({ x, y, texts });

    const traces: Data[] = [
      {
        x,
        y,
        name: "Cumulative Score",
        type: "scatter",
        mode: "lines",
        "line.shape": "hv",
        line: { color: "#2563eb", width: 2, shape: "hv" },
        fill: "tozeroy",
        hovertemplate: texts,
        marker: { color: "#ff0000", size: 100 },
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
          text: "Probability (%)",
          font: { size: 16, weight: 700 },
        },
        range: [50, 100],
        showgrid: true,
        zeroline: true,
      },
      yaxis: {
        title: {
          text: "Cumulative Score",
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
