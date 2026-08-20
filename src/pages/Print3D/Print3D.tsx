import { useState } from "react";

export default function Print3D() {
  const [file, setFile] = useState(null);
  const [length, setLength] = useState(5);
  const [spacing, setSpacing] = useState(1);
  const [thickness, setThickness] = useState(0.4);
  const [density, setDensity] = useState(50);

  return (
    <div className="ml-20 min-h-screen p-6 space-y-10">
      <h1 className="text-3xl font-bold">3D Printed Bristles</h1>

      <section className="rounded-lg border p-6 space-y-4">
        <h2 className="text-xl font-semibold">Model</h2>

        <input
          type="file"
          accept=".stl"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        {file && <p className="text-sm text-gray-500">Loaded: {file.name}</p>}
      </section>

      <section className="rounded-lg border p-6 space-y-6">
        <h2 className="text-xl font-semibold">Bristles</h2>

        <label className="block">
          <span>Bristle length: {length} mm</span>
          <input
            className="w-full"
            type="range"
            min="1"
            max="50"
            step="0.5"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
          />
        </label>

        <label className="block">
          <span>Spacing: {spacing} mm</span>
          <input
            className="w-full"
            type="range"
            min="0.2"
            max="5"
            step="0.1"
            value={spacing}
            onChange={(e) => setSpacing(Number(e.target.value))}
          />
        </label>

        <label className="block">
          <span>Thickness: {thickness} mm</span>
          <input
            className="w-full"
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={thickness}
            onChange={(e) => setThickness(Number(e.target.value))}
          />
        </label>

        <label className="block">
          <span>Density: {density}%</span>
          <input
            className="w-full"
            type="range"
            min="1"
            max="100"
            value={density}
            onChange={(e) => setDensity(Number(e.target.value))}
          />
        </label>
      </section>

      <button
        className="rounded bg-black px-5 py-3 text-white"
        disabled={!file}
        onClick={() =>
          console.log({
            file,
            length,
            spacing,
            thickness,
            density,
          })
        }
      >
        Generate G-code
      </button>
    </div>
  );
}
