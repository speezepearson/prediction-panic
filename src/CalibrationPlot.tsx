import { Data, Layout } from "plotly.js";
import { useEffect, useMemo, useState } from "react";
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
  width,
}: {
  data: CalibrationData[];
  width: number;
}) => {
  const plotData = useMemo((): { traces: Data[]; layout: Partial<Layout> } => {
    const x: number[] = [];
    const y: number[] = [];
    const texts: string[] = [];
    for (const d of data) {
      const [rightAnswer, wrongAnswer] = d.question.answer
        ? [d.question.right, d.question.left]
        : [d.question.left, d.question.right];
      const score = scoreGuess(d.prob, d.question.answer);
      const [greaterProb, greaterAnswer] =
        d.prob < 0.5
          ? [1 - d.prob, d.question.left]
          : [d.prob, d.question.right];
      const text = `Q. ${d.question.text}<br>A. ${rightAnswer} (vs ${wrongAnswer})<br>You: ${greaterAnswer} ${formatProbabilityAsPercentage(greaterProb)} (${formatPlusMinusInt(score)}pt)`;

      x.push(x.length + 1);
      y.push((y[y.length - 1] ?? 0) + scoreGuess(d.prob, d.question.answer));
      texts.push(text);
    }

    const traces: Data[] = [
      {
        x,
        y,
        name: "Cumulative Score",
        type: "scatter",
        mode: "lines+markers",
        "line.shape": "hv",
        line: { color: "#2563eb", width: 2, shape: "hv" },
        fill: "tozeroy",
        hovertemplate: texts,
        hoverlabel: { align: "left" },
        marker: { color: "#2563eb", size: 10 },
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
      xaxis: {
        title: {
          text: "Round #",
          font: { size: 16, weight: 700 },
        },
        range: [0, x.length + 1],
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
      autosize: true,
      // width: 600,
      height: 500,
    };

    return { traces, layout };
  }, [data]);

  // const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  // useEffect(() => {
  //   const handleResize = () => setScreenWidth(window.innerWidth);
  //   window.addEventListener("resize", handleResize);
  //   return () => window.removeEventListener("resize", handleResize);
  // }, []);

  return (
    <Plot
      data={plotData.traces}
      layout={plotData.layout}
      config={{
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ["lasso2d", "select2d"],
      }}
      style={{ width: `${width}px`, height: "500px" }}
      className="border border-gray-300 my-4"
    />
  );
};
