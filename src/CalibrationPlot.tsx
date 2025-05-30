import { useEffect, useRef } from "react";
import * as d3 from "d3";

export type CalibrationData = { prob: number; actual: boolean };

export const CalibrationPlot = ({
  data,
  title,
}: {
  data: CalibrationData[];
  title: string;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const margin = { top: 20, right: 80, bottom: 50, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Sort data by probability
    const sortedData = [...data].sort((a, b) => a.prob - b.prob);

    // Create cumulative data points
    const cumulativeData: {
      prob: number;
      cumProb: number;
      cumActual: number;
      index: number;
    }[] = [];
    let cumProb = 0;
    let cumActual = 0;

    sortedData.forEach((d, i) => {
      cumProb += d.prob;
      if (d.actual) cumActual += 1;

      cumulativeData.push({
        prob: d.prob,
        cumProb: cumProb,
        cumActual: cumActual,
        index: i + 1,
      });
    });

    // Scales
    const xScale = d3.scaleLinear().domain([0, 1]).range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([
        0,
        Math.max(
          d3.max(cumulativeData, (d) => d.cumProb)!,
          d3.max(cumulativeData, (d) => d.cumActual)!
        ),
      ])
      .range([height, 0]);

    // Line generators
    const probLine = d3
      .line() // @ts-expect-error-line
      .x((d) => xScale(d.prob)) // @ts-expect-error-line
      .y((d) => yScale(d.cumProb))
      .curve(d3.curveStepAfter);

    const actualLine = d3
      .line() // @ts-expect-error-line
      .x((d) => xScale(d.prob)) // @ts-expect-error-line
      .y((d) => yScale(d.cumActual))
      .curve(d3.curveStepAfter);

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .append("text")
      .attr("x", width / 2)
      .attr("y", 35)
      .attr("fill", "black")
      .style("text-anchor", "middle")
      .text("Probability");

    g.append("g")
      .call(d3.axisLeft(yScale))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -height / 2)
      .attr("fill", "black")
      .style("text-anchor", "middle")
      .text("Cumulative Count");

    // Add lines
    g.append("path")
      .datum(cumulativeData)
      .attr("fill", "none")
      .attr("stroke", "#2563eb")
      .attr("stroke-width", 2) // @ts-expect-error-line
      .attr("d", probLine);

    g.append("path")
      .datum(cumulativeData)
      .attr("fill", "none")
      .attr("stroke", "#dc2626")
      .attr("stroke-width", 2) // @ts-expect-error-line
      .attr("d", actualLine);

    // Add legend
    const legend = g
      .append("g")
      .attr("transform", `translate(${width - 150}, 20)`);

    legend
      .append("line")
      .attr("x1", 0)
      .attr("x2", 20)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", "#2563eb")
      .attr("stroke-width", 2);

    legend
      .append("text")
      .attr("x", 25)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .text("Cumulative Probabilities")
      .style("font-size", "12px");

    legend
      .append("line")
      .attr("x1", 0)
      .attr("x2", 20)
      .attr("y1", 20)
      .attr("y2", 20)
      .attr("stroke", "#dc2626")
      .attr("stroke-width", 2);

    legend
      .append("text")
      .attr("x", 25)
      .attr("y", 20)
      .attr("dy", "0.35em")
      .text("Cumulative Actuals")
      .style("font-size", "12px");

    // Add title
    g.append("text")
      .attr("x", width / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(title);
  }, [data, title]);

  return (
    <div className="p-4">
      <svg
        ref={svgRef}
        width="600"
        height="400"
        className="border border-gray-300"
      />
    </div>
  );
};
