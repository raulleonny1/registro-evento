/**
 * Safari/iPadOS a menudo solo aplica teclado numérico/decim si el atributo `pattern`
 * va junto a `inputMode`, y se desactiva autocorrección (si no, aparece teclado alfabético).
 */

/** Importes en € (coma o punto decimal). */
export const iosDecimalMoneyInputProps = {
  inputMode: "decimal" as const,
  pattern: "[0-9]+([.,][0-9]*)?",
  autoCapitalize: "off" as const,
  autoCorrect: "off" as const,
  spellCheck: false as const,
};

/** Solo dígitos (p. ej. últimos 4 del teléfono). `type="tel"` mejora el teclado en iOS frente a `text`. */
export const iosDigitOnlyInputProps = {
  type: "tel" as const,
  inputMode: "numeric" as const,
  pattern: "[0-9]*",
  autoCapitalize: "none" as const,
  autoCorrect: "off" as const,
  spellCheck: false as const,
};

/** PIN solo números; la máscara visual se hace con CSS (-webkit-text-security). */
export const iosNumericPinInputProps = {
  type: "text" as const,
  inputMode: "numeric" as const,
  pattern: "[0-9]*",
  autoCapitalize: "none" as const,
  autoCorrect: "off" as const,
  spellCheck: false as const,
};
