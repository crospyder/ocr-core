// #BarChart.jsx
import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BarChart = () => {
  const data = {
    labels: ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"],
    datasets: [
      {
        label: "Dokumenti",
        data: [12, 19, 3, 5, 2, 3, 7],
        backgroundColor: "rgba(26, 130, 226, 0.6)",
        borderRadius: 8,
        maxBarThickness: 48,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Broj dokumenata po danima" },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        grid: { display: false },
        title: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
        grid: { color: "#e8ecf1" },
      },
    },
  };

  return (
    <div className="card shadow mb-4">
      <div className="card-body">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default BarChart;
