import { useState } from "react";

export default function Print3D() {
  const [stripLength, setStripLength] = useState(100);
  const [stripWidth, setStripWidth] = useState(10);
  const [stripThickness, setStripThickness] = useState(1);
  const [bristleLength, setBristleLength] = useState(20);
  const [bristleSpacing, setBristleSpacing] = useState(1);
  const [bristleThickness, setBristleThickness] = useState(0.4);

  function generateGCode() {
    const lines = [
      "; 3D BRISTLE GENERATOR",
      `; Strip: ${stripLength} x ${stripWidth} x ${stripThickness} mm`,
      `; Bristles: ${bristleLength} mm`,
      "",
      "G21 ; millimetres",
      "G90 ; absolute positioning",
      "M82 ; absolute extrusion",
      "G28 ; home",
      "M104 S215",
      "M109 S215",
      "G92 E0",
      "",
    ];

    // Print the rectangular base strip.
    lines.push("; BASE STRIP");

    const z = 0.2;
    const extrusionPerMm = 0.04;

    lines.push(`G0 Z${z}`);
    lines.push("G0 X0 Y0");

    lines.push(`G1 X${stripLength} Y0 E${stripLength * extrusionPerMm}`);
    lines.push(
      `G1 X${stripLength} Y${stripWidth} E${stripWidth * extrusionPerMm}`,
    );
    lines.push(`G1 X0 Y${stripWidth} E${stripLength * extrusionPerMm}`);
    lines.push(`G1 X0 Y0 E${stripWidth * extrusionPerMm}`);

    // Generate sideways bristles along one long edge.
    lines.push("");
    lines.push("; BRISTLES");

    let e = stripLength * extrusionPerMm * 2;

    for (let x = 0; x <= stripLength; x += bristleSpacing) {
      // Move to the edge.
      lines.push(`G0 X${x.toFixed(3)} Y${stripWidth}`);

      // Extrude a small anchor.
      e += 0.08;
      lines.push(`G1 E${e.toFixed(4)}`);

      // Rapid sideways movement stretches the molten filament.
      lines.push(
        `G0 X${x.toFixed(3)} Y${(stripWidth + bristleLength).toFixed(3)}`,
      );

      // Retract before moving to the next bristle.
      e -= 0.05;
      lines.push(`G1 E${e.toFixed(4)}`);
    }

    lines.push("");
    lines.push("M104 S0");
    lines.push("M140 S0");
    lines.push("G28 X0");
    lines.push("M84");

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "bristle-strip.gcode";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="ml-20 min-h-screen p-6 space-y-8">
      <h1 className="text-3xl font-bold">3D Printed Bristle Generator</h1>

      <section className="rounded-lg border p-6 space-y-6">
        <h2 className="text-xl font-semibold">Strip</h2>

        <NumberInput
          label="Strip length (mm)"
          value={stripLength}
          setValue={setStripLength}
        />

        <NumberInput
          label="Strip width (mm)"
          value={stripWidth}
          setValue={setStripWidth}
        />

        <NumberInput
          label="Strip thickness (mm)"
          value={stripThickness}
          setValue={setStripThickness}
        />
      </section>

      <section className="rounded-lg border p-6 space-y-6">
        <h2 className="text-xl font-semibold">Bristles</h2>

        <NumberInput
          label="Bristle length (mm)"
          value={bristleLength}
          setValue={setBristleLength}
        />

        <NumberInput
          label="Bristle spacing (mm)"
          value={bristleSpacing}
          setValue={setBristleSpacing}
        />

        <NumberInput
          label="Bristle thickness (mm)"
          value={bristleThickness}
          setValue={setBristleThickness}
        />
      </section>

      <button
        onClick={generateGCode}
        className="rounded bg-black px-6 py-3 text-white"
      >
        Generate G-code
      </button>
    </div>
  );
}

function NumberInput({ label, value, setValue }) {
  return (
    <label className="block">
      <span className="block mb-2">{label}</span>

      <input
        type="number"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="border rounded px-3 py-2 w-full"
        min="0"
        step="0.1"
      />
    </label>
  );
}
