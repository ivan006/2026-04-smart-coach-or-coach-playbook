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
      "G21",
      "G90",
      "M82",
      "G28",
      "M104 S215",
      "M109 S215",
      "G92 E0",
      "",
      "; BASE STRIP",
      "G0 Z0.2",
      "G0 X0 Y0",
      `G1 X${stripLength} Y0 E${stripLength * 0.04}`,
      `G1 X${stripLength} Y${stripWidth} E${stripWidth * 0.04}`,
      `G1 X0 Y${stripWidth} E${stripLength * 0.04}`,
      `G1 X0 Y0 E${stripWidth * 0.04}`,
      "",
      "; BRISTLES",
    ];

    let e = stripLength * 0.08;

    for (let x = 0; x <= stripLength; x += bristleSpacing) {
      lines.push(`G0 X${x.toFixed(3)} Y${stripWidth}`);

      e += 0.08;
      lines.push(`G1 E${e.toFixed(4)}`);

      lines.push(
        `G0 X${x.toFixed(3)} Y${(stripWidth + bristleLength).toFixed(3)}`,
      );

      e -= 0.05;
      lines.push(`G1 E${e.toFixed(4)}`);
    }

    lines.push("", "M104 S0", "M140 S0", "G28 X0", "M84");

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

  const NumberInput = ({ label, value, setValue }) => (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>

      <input
        type="number"
        value={value}
        min="0"
        step="0.1"
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full rounded border px-3 py-2"
      />
    </label>
  );

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold sm:text-4xl">
            3D Printed Bristle Generator
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Generate sideways-extruded bristles from a simple printed strip.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-xl border p-5 sm:p-6">
            <h2 className="mb-6 text-xl font-semibold">Strip</h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <NumberInput
                label="Length (mm)"
                value={stripLength}
                setValue={setStripLength}
              />

              <NumberInput
                label="Width (mm)"
                value={stripWidth}
                setValue={setStripWidth}
              />

              <NumberInput
                label="Thickness (mm)"
                value={stripThickness}
                setValue={setStripThickness}
              />
            </div>
          </section>

          <section className="rounded-xl border p-5 sm:p-6">
            <h2 className="mb-6 text-xl font-semibold">Bristles</h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <NumberInput
                label="Length (mm)"
                value={bristleLength}
                setValue={setBristleLength}
              />

              <NumberInput
                label="Spacing (mm)"
                value={bristleSpacing}
                setValue={setBristleSpacing}
              />

              <NumberInput
                label="Thickness (mm)"
                value={bristleThickness}
                setValue={setBristleThickness}
              />
            </div>
          </section>
        </div>

        <section className="rounded-xl border p-5 sm:p-6">
          <h2 className="mb-4 text-xl font-semibold">Preview</h2>

          <div className="flex min-h-48 items-center justify-center rounded-lg bg-gray-100 p-6">
            <div
              className="relative h-8 rounded bg-gray-700"
              style={{ width: `${Math.min(stripLength * 3, 600)}px` }}
            >
              <div className="absolute bottom-full left-0 flex w-full justify-between">
                {Array.from({
                  length: Math.min(
                    Math.floor(stripLength / bristleSpacing),
                    100,
                  ),
                }).map((_, i) => (
                  <div
                    key={i}
                    className="w-px bg-gray-900"
                    style={{
                      height: `${Math.min(bristleLength * 3, 100)}px`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <button
          onClick={generateGCode}
          className="w-full rounded-xl bg-black px-6 py-4 font-semibold text-white hover:bg-gray-800 sm:w-auto"
        >
          Generate G-code
        </button>
      </div>
    </div>
  );
}
