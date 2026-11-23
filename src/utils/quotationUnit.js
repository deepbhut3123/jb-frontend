export function quotationItemUnit(code) {
  return /(?:^|[\s/-])(?:HGR|SCR|SBR|LM)(?=[A-Z0-9])/i.test(String(code || "")) ? "Mtr" : "Nos.";
}
