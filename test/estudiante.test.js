// PLANTILLA DEL ESTUDIANTE. Complete las Partes B y C.
// Use `npm run mutation` para medir su avance.
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { calcularTotal } from "../src/pedido.js";

// ---------- Parte B: ejemplos con valores exactos ----------
// describe("Parte B: ejemplos exactos", () => {
//   it.todo("sin descuentos: subtotal 50000 -> total exacto");
//   it.todo("justo en el umbral de 100000");
//   it.todo("cliente frecuente: total exacto");
//   it.todo("cupón PROMO10: total exacto");
//   it.todo("descuentos acumulados que activan el tope de 20%");
// });

// ---------- Parte C: propiedades (fast-check) ----------
const subtotalArb = fc.oneof(
  fc.constantFrom(0, 99_999, 100_000, 100_001),
  fc.integer({ min: 0, max: 5_000_000 })
);
const clienteArb = fc.constantFrom("normal", "frecuente");
const cuponArb = fc.constantFrom(undefined, "PROMO10", "OTRO");

describe("Parte C: propiedades", () => {
  it("el total queda entre cero y el subtotal con IVA redondeado", () => {
    fc.assert(
      fc.property(subtotalArb, clienteArb, cuponArb, (subtotal, cliente, cupon) => {
        const total = calcularTotal({ subtotal, cliente, cupon });
        expect(total).toBeGreaterThanOrEqual(0);
        expect(total).toBeLessThanOrEqual(Math.round(subtotal * 113 / 100));
      }),
      { examples: [[0, "normal", undefined]] }
    );
  });

  it("respeta el tope del 20 % y lo alcanza con monto alto y cupón", () => {
    fc.assert(
      fc.property(subtotalArb, clienteArb, cuponArb, (subtotal, cliente, cupon) => {
        // Con el descuento máximo e IVA se pagan 904 colones por cada 1000.
        const minimo = Math.round(subtotal * 904 / 1000);
        const total = calcularTotal({ subtotal, cliente, cupon });
        expect(total).toBeGreaterThanOrEqual(minimo);
        if (subtotal >= 100_000 && cupon === "PROMO10") {
          expect(total).toBe(minimo);
        }
      }),
      { examples: [[100_000, "normal", "PROMO10"], [100_001, "frecuente", "PROMO10"]] }
    );
  });

  it("el cupón nunca aumenta el total y lo reduce para el cliente normal desde 10 colones", () => {
    fc.assert(
      fc.property(subtotalArb, clienteArb, (subtotal, cliente) => {
        const sinCupon = calcularTotal({ subtotal, cliente });
        const conCupon = calcularTotal({ subtotal, cliente, cupon: "PROMO10" });
        expect(conCupon).toBeLessThanOrEqual(sinCupon);
        if (cliente === "normal" && subtotal >= 10) {
          expect(conCupon).toBeLessThan(sinCupon);
        }
      }),
      { examples: [[99_999, "normal"], [100_000, "normal"]] }
    );
  });

  it("sin cupón, el cliente frecuente paga estrictamente menos desde 20 colones", () => {
    // A partir de 20, el 5 % más IVA separa los totales por más de un colón.
    fc.assert(
      fc.property(fc.integer({ min: 20, max: 5_000_000 }), (subtotal) => {
        const normal = calcularTotal({ subtotal, cliente: "normal" });
        const frecuente = calcularTotal({ subtotal, cliente: "frecuente" });
        expect(frecuente).toBeLessThan(normal);
      }),
      { examples: [[20], [99_999], [100_000], [100_001]] }
    );
  });

  it("un subtotal negativo siempre lanza RangeError", () => {
    fc.assert(
      fc.property(fc.integer({ max: -1 }), clienteArb, cuponArb, (subtotal, cliente, cupon) => {
        expect(() => calcularTotal({ subtotal, cliente, cupon })).toThrow(RangeError);
      }),
      { examples: [[-1, "normal", undefined]] }
    );
  });

  it("al cruzar el umbral, el descuento por monto reduce el total", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (distancia) => {
        const antes = calcularTotal({ subtotal: 100_000 - distancia, cliente: "normal" });
        const enUmbral = calcularTotal({ subtotal: 100_000, cliente: "normal" });
        expect(enUmbral).toBeLessThan(antes);
      }),
      { examples: [[1]] }
    );
  });
});
