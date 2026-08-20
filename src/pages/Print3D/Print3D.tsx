import { useState } from "react";

function NumberInput({ label, name, values, update }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-900">
        {label}
      </span>

      <input
        type="number"
        value={values[name]}
        min="0"
        step="0.1"
        onChange={(e) => update(name, e.target.value)}
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-gray-500 focus:outline-none"
      />
    </label>
  );
}

export default function Print3D() {
  const [values, setValues] = useState({
    stripLength: "100",
    stripWidth: "10",
    stripThickness: "1",
    bristleLength: "20",
    bristleSpacing: "1",
    bristleThickness: "0.4",
  });

  function update(name, value) {
    setValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function number(name) {
    return Number(values[name]) || 0;
  }

  function generateGCode() {
    const stripLength = number("stripLength");
    const stripWidth = number("stripWidth");
    const stripThickness = number("stripThickness");
    const bristleLength = number("bristleLength");
    const bristleSpacing = Math.max(number("bristleSpacing"), 0.1);

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

  const bristleCount = Math.min(
    Math.floor(number("stripLength") / number("bristleSpacing")),
    100,
  );

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            3D Printed Bristle Generator
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Generate sideways-extruded bristles from a simple printed strip.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">Strip</h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <NumberInput
                label="Length (mm)"
                name="stripLength"
                values={values}
                update={update}
              />

              <NumberInput
                label="Width (mm)"
                name="stripWidth"
                values={values}
                update={update}
              />

              <NumberInput
                label="Thickness (mm)"
                name="stripThickness"
                values={values}
                update={update}
              />
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">
              Bristles
            </h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <NumberInput
                label="Length (mm)"
                name="bristleLength"
                values={values}
                update={update}
              />

              <NumberInput
                label="Spacing (mm)"
                name="bristleSpacing"
                values={values}
                update={update}
              />

              <NumberInput
                label="Thickness (mm)"
                name="bristleThickness"
                values={values}
                update={update}
              />
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Preview</h2>

          <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-lg bg-gray-100 p-6">
            <div className="relative h-8 w-full max-w-2xl rounded bg-gray-700">
              <div className="absolute bottom-full left-0 flex w-full justify-between">
                {Array.from({
                  length: bristleCount,
                }).map((_, i) => (
                  <div
                    key={i}
                    className="w-px bg-gray-900"
                    style={{
                      height: `${Math.min(number("bristleLength") * 3, 100)}px`,
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
