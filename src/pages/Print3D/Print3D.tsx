import { useMemo, useState } from "react";
import Print3DPreview from "./Print3DPreview";
import {
  buildAllBristles,
  StripParams,
  BristleParams,
} from "./bristleGeometry";
import { generateGCode, downloadGCode } from "./generateGCode";

const MAX_SIZE = 220;

type Values = {
  stripLength: string;
  stripWidth: string;
  stripThickness: string;
  bristleLength: string;
  bristleSpacingX: string;
  bristleSpacingY: string;
  bristleThickness: string;
};

function NumberInput({
  label,
  name,
  values,
  update,
  max,
}: {
  label: string;
  name: keyof Values;
  values: Values;
  update: (name: keyof Values, value: string, max?: number) => void;
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
  const [values, setValues] = useState<Values>({
    stripLength: "100",
    stripWidth: "10",
    stripThickness: "2",
    bristleLength: "20",
    bristleSpacingX: "2",
    bristleSpacingY: "2",
    bristleThickness: "0.4",
  });

  function update(name: keyof Values, value: string, max?: number) {
    if (value !== "" && max !== undefined && Number(value) > max) {
      value = String(max);
    }

    setValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function number(name: keyof Values) {
    return Number(values[name]) || 0;
  }

  const strip: StripParams = {
    stripLength: Math.min(number("stripLength"), MAX_SIZE),
    stripWidth: Math.min(number("stripWidth"), MAX_SIZE),
    stripThickness: Math.max(number("stripThickness"), 0.1),
  };

  const bristleParams: BristleParams = {
    bristleLength: Math.max(number("bristleLength"), 0.5),
    bristleSpacingX: Math.max(number("bristleSpacingX"), 0.1),
    bristleSpacingY: Math.max(number("bristleSpacingY"), 0.1),
    bristleThickness: Math.max(number("bristleThickness"), 0.1),
  };

  // Single source of truth: both the preview and the G-code
  // generator are built from this same call, so they cannot
  // disagree about bristle placement or shape.
  const bristles = useMemo(
    () => buildAllBristles(strip, bristleParams),
    [
      strip.stripLength,
      strip.stripWidth,
      strip.stripThickness,
      bristleParams.bristleLength,
      bristleParams.bristleSpacingX,
      bristleParams.bristleSpacingY,
      bristleParams.bristleThickness,
    ],
  );

  function handleGenerateGCode() {
    const gcode = generateGCode({ strip, bristles: bristleParams });
    downloadGCode(gcode);
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            3D Printed Bristle Generator
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Design a strip with upward-leaning, densely tiled bristles.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                label="Width (Y) — mm"
                name="stripWidth"
                values={values}
                update={update}
                max={MAX_SIZE}
              />

              <NumberInput
                label="Thickness (Z) — mm"
                name="stripThickness"
                values={values}
                update={update}
              />
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">
              Bristles
            </h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <NumberInput
                label="Length — mm"
                name="bristleLength"
                values={values}
                update={update}
              />

              <NumberInput
                label="Thickness — mm"
                name="bristleThickness"
                values={values}
                update={update}
              />

              <NumberInput
                label="Spacing X — mm"
                name="bristleSpacingX"
                values={values}
                update={update}
              />

              <NumberInput
                label="Spacing Y — mm"
                name="bristleSpacingY"
                values={values}
                update={update}
              />
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Bristles lean away from vertical as needed, but the tool
              automatically limits the lean angle so neighboring bristles never
              collide — tight spacing produces straighter, denser bristles; wide
              spacing allows more dramatic lean.
            </p>
          </section>
        </div>

        <Print3DPreview
          strip={strip}
          bristles={bristles}
          bristleThickness={bristleParams.bristleThickness}
        />

        <button
          onClick={handleGenerateGCode}
          className="w-full rounded-xl bg-black px-6 py-4 font-semibold text-white hover:bg-gray-800 sm:w-auto"
        >
          Generate G-code
        </button>
      </div>
    </div>
  );
}
