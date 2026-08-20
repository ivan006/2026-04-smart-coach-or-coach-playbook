import { useState } from "react";
import Print3DPreview from "./Print3DPreview";

const MAX_SIZE = 220;
const STRIP_THICKNESS = 2;

function NumberInput({
  label,
  name,
  values,
  update,
  max,
}: {
  label: string;
  name: string;
  values: Record<string, string>;
  update: (name: string, value: string, max?: number) => void;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-900">
        {label}
      </span>

      <input
        type="number"
        value={values[name]}
        min="0.1"
        max={max}
        step="0.1"
        onChange={(e) => update(name, e.target.value, max)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400"
      />
    </label>
  );
}

export default function Print3D() {
  const [values, setValues] = useState({
    stripLength: "100",
    stripWidth: "10",
    bristleLength: "20",
    bristleSpacing: "2",
    bristleThickness: "0.4",
  });

  function update(name: string, value: string, max?: number) {
    if (value !== "" && max !== undefined && Number(value) > max) {
      value = String(max);
    }

    setValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function number(name: string) {
    return Number(values[name]) || 0;
  }

  function generateGCode() {
    const stripLength = Math.min(number("stripLength"), MAX_SIZE);

    const stripWidth = Math.min(number("stripWidth"), MAX_SIZE);

    const bristleLength = number("bristleLength");

    const bristleSpacing = Math.max(number("bristleSpacing"), 0.1);

    const bristleThickness = Math.max(number("bristleThickness"), 0.1);

    const lines = [
      "; 3D BRISTLE GENERATOR",
      "",
      `; X = strip length: ${stripLength} mm`,
      `; Y = strip thickness: ${STRIP_THICKNESS} mm`,
      `; Z = strip width: ${stripWidth} mm`,
      `; Bristle length: ${bristleLength} mm`,
      `; Bristle spacing: ${bristleSpacing} mm`,
      `; Bristle thickness: ${bristleThickness} mm`,
      "",
      "G21",
      "G90",
      "M82",
      "G28",
      "",
      "M104 S215",
      "M109 S215",
      "G92 E0",
      "",
      "; BASE STRIP",
      "",
      "G0 X0 Y0 Z0.2",
      `G1 X${stripLength} E${(stripLength * 0.04).toFixed(4)}`,
      "",
      "; BRISTLES",
      "",
    ];

    let e = stripLength * 0.08;

    for (let x = 0; x <= stripLength; x += bristleSpacing) {
      lines.push(`G0 X${x.toFixed(3)} Y${STRIP_THICKNESS} Z0`);

      e += 0.08;

      lines.push(`G1 E${e.toFixed(4)}`);

      lines.push(
        `G0 X${x.toFixed(3)} Y${(STRIP_THICKNESS + bristleLength).toFixed(
          3,
        )} Z0`,
      );

      e -= 0.05;

      lines.push(`G1 E${e.toFixed(4)}`);
    }

    lines.push("", "M104 S0", "M140 S0", "G28 X0", "M84");

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "bristle-strip.gcode";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            3D Printed Bristle Generator
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Design a strip with sideways-extruded bristles.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* STRIP */}

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">Strip</h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <NumberInput
                label="Length (X) — mm"
                name="stripLength"
                values={values}
                update={update}
                max={MAX_SIZE}
              />

              <NumberInput
                label="Width / Height (Z) — mm"
                name="stripWidth"
                values={values}
                update={update}
                max={MAX_SIZE}
              />
            </div>

            <div className="mt-5 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              <div>
                Maximum length: <strong>{MAX_SIZE} mm</strong>
              </div>

              <div>
                Maximum width: <strong>{MAX_SIZE} mm</strong>
              </div>

              <div>
                Fixed thickness (Y): <strong>{STRIP_THICKNESS} mm</strong>
              </div>
            </div>
          </section>

          {/* BRISTLES */}

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">
              Bristles
            </h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <NumberInput
                label="Length (Y) — mm"
                name="bristleLength"
                values={values}
                update={update}
              />

              <NumberInput
                label="Spacing (X) — mm"
                name="bristleSpacing"
                values={values}
                update={update}
              />

              <NumberInput
                label="Thickness — mm"
                name="bristleThickness"
                values={values}
                update={update}
              />
            </div>
          </section>
        </div>

        <Print3DPreview
          stripLength={number("stripLength")}
          stripWidth={number("stripWidth")}
          stripThickness={STRIP_THICKNESS}
          bristleLength={number("bristleLength")}
          bristleSpacing={number("bristleSpacing")}
          bristleThickness={number("bristleThickness")}
        />

        <button
          onClick={generateGCode}
          className="w-full rounded-xl bg-black px-6 py-4 font-semibold text-white transition hover:bg-gray-800 sm:w-auto"
        >
          Generate G-code
        </button>
      </div>
    </div>
  );
}
