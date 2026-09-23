import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://kids_fashion:kids_fashion_dev@localhost:54329/kids_fashion?schema=public',
});

await client.connect();

const orderRes = await client.query(
  "SELECT id, order_number, status, total_amount FROM orders WHERE order_number = 'ORD-20260917-000001'"
);
console.log('ORDER:', orderRes.rows[0]);

if (orderRes.rows[0]) {
  const paymentRes = await client.query(
    'SELECT id, method, status, amount, provider_transaction_id FROM payments WHERE order_id = $1',
    [orderRes.rows[0].id]
  );
  console.log('PAYMENT:', paymentRes.rows[0]);

  const txRes = await client.query(
    'SELECT id, type, status, attempt_ref, provider_transaction_id, created_at FROM payment_transactions WHERE payment_id = $1 ORDER BY created_at ASC',
    [paymentRes.rows[0].id]
  );
  console.log('TRANSACTIONS:', txRes.rows);
}

await client.end();
