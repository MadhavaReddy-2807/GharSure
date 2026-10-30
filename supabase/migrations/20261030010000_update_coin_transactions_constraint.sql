-- Expand coin_transactions_type_check to permit VOUCHER_UNLOCK, ORDER_PURCHASE, and STORE_REDEMPTION
ALTER TABLE coin_transactions DROP CONSTRAINT IF EXISTS coin_transactions_type_check;

ALTER TABLE coin_transactions ADD CONSTRAINT coin_transactions_type_check 
  CHECK (type IN (
    'SURVEY_REWARD',
    'REFERRAL_BONUS',
    'STORE_REDEMPTION',
    'MANUAL_ADJUSTMENT',
    'WELCOME_BONUS',
    'VOUCHER_UNLOCK',
    'ORDER_PURCHASE'
  ));
