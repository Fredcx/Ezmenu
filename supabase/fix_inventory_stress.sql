-- FIX CONCURRENCY STRESS BUGS na Baixa de Estoque
-- Isso força o desconto na fila do banco de dados, protegendo contra acessos de múltiplos cozinheiros ao mesmo milésimo de segundo.

CREATE OR REPLACE FUNCTION decrement_inventory(item_id UUID, deduct_amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE inventory
  SET quantity = GREATEST(0, quantity - deduct_amount)
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql;
