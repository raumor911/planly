import { PreservationEngine } from './engine';

async function runTest() {
  const engine = new PreservationEngine() as any; // Cast to any to access private method for testing
  
  console.log('--- TEST: Sanador de Tag Splitting (Word Fragmentation) ---');

  // Caso 1: {{tema}} partido en 3 nodos w:t
  const splitXml = `
    <w:p>
      <w:r>
        <w:t>{</w:t>
        <w:t>{</w:t>
        <w:t>tema}}</w:t>
      </w:r>
    </w:p>
  `;

  console.log('\nEntrada (XML Fragmentado):');
  console.log(splitXml.trim());

  const result = engine.sanitizeTagSplitting(splitXml);
  const sanitized = result.xml;

  console.log('\nSalida (XML Saneado):');
  console.log(sanitized.trim());
  console.log(`Reemplazos realizados: ${result.replacements}`);

  if (sanitized.includes('{{tema}}') && !sanitized.includes('<w:t>{</w:t>')) {
    console.log('\n✅ RESULTADO: ÉXITO - El marcador fue consolidado correctamente.');
  } else {
    console.log('\n❌ RESULTADO: FALLO - No se consolidó el marcador.');
    process.exit(1);
  }

  // Caso 2: Placeholder con etiquetas de corrección ortográfica en medio
  const proofErrXml = `
    <w:p>
      <w:r>
        <w:t>{{</w:t>
      </w:r>
      <w:proofErr w:type="spellStart"/>
      <w:r>
        <w:t>objetivo</w:t>
      </w:r>
      <w:proofErr w:type="spellEnd"/>
      <w:r>
        <w:t>}}</w:t>
      </w:r>
    </w:p>
  `;

  console.log('\nEntrada (Con proofErr de Word):');
  console.log(proofErrXml.trim());

  const result2 = engine.sanitizeTagSplitting(proofErrXml);
  const sanitized2 = result2.xml;

  console.log('\nSalida (XML Saneado):');
  console.log(sanitized2.trim());
  console.log(`Reemplazos realizados: ${result2.replacements}`);

  if (sanitized2.includes('{{objetivo}}')) {
    console.log('\n✅ RESULTADO: ÉXITO - El ruido de Word fue eliminado.');
  } else {
    console.log('\n❌ RESULTADO: FALLO - El ruido persiste.');
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error('Error durante el test:', err);
  process.exit(1);
});
