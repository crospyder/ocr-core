// src/components/dashboard/BarChart.jsx
import React from "react";
import { Card } from "react-bootstrap";
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
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Broj dokumenata po danima" },
    },
  };

  return (
    <Card className="shadow-sm mb-4">
      <Card.Body>
        <Bar data={data} options={options} />
      </Card.Body>
    </Card>
  );
};

export default BarChart;