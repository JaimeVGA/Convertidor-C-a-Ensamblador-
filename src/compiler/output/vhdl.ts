import { AssembledLine } from '../riscv/assembler';

export type RomDepth = 32 | 64 | 128 | 256;

const UPPER_BIT_BY_DEPTH: Record<RomDepth, number> = {
  32: 6,
  64: 7,
  128: 8,
  256: 9,
};

export function generateVhdl(
  listado: AssembledLine[],
  depth: RomDepth = 32
): string {
  const upperBit = UPPER_BIT_BY_DEPTH[depth] ?? 6;
  const maxIndex = depth - 1;

  const romEntries = listado.map((line) => {
    const idxStr = String(line.index).padEnd(2, ' ');
    const labelPrefix =
      line.labels.length > 0
        ? `${line.labels[line.labels.length - 1]}: `.padEnd(13, ' ')
        : '             ';
    const asmAligned = line.asmText.padEnd(22, ' ');
    const extraParts: string[] = [];
    if (line.comment) extraParts.push(line.comment);
    if (line.cLine !== undefined) extraParts.push(`C línea ${line.cLine}`);
    const extraSuffix =
      extraParts.length > 0 ? ` (${extraParts.join(' · ')})` : '';

    return `        ${idxStr} => x"${line.hex}", -- ${labelPrefix}${asmAligned}${extraSuffix}`.trimEnd();
  });

  return `library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity instruction_memory is
    port (
        addr : in  std_logic_vector(31 downto 0); -- Dirección proveniente del PC
        data : out std_logic_vector(31 downto 0)  -- Instrucción entregada al procesador
    );
end entity instruction_memory;

architecture Behavioral of instruction_memory is

    -- Definición de la ROM para guardar hasta ${depth} instrucciones
    type rom_type is array (0 to ${maxIndex}) of std_logic_vector(31 downto 0);
    
    constant ROM : rom_type := (
${romEntries.join('\n')}

        others => (others => '0')
    );

begin

    ------------------------------------------------------------------
    -- Lectura Combinacional Alinear a Palabras
    -- Mapea addr(${upperBit} downto 2) -> Rango de 0 a ${maxIndex} palabras
    ------------------------------------------------------------------
    process(addr)
        variable index : integer;
    begin
        index := to_integer(unsigned(addr(${upperBit} downto 2)));
        if index >= 0 and index < ${depth} then
            data <= ROM(index);
        else
            data <= (others => '0');
        end if;
    end process;

end architecture Behavioral;
`;
}
