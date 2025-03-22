import authPrepper from './prep_utils/enc_dec_ochestrator.js'
const encrypt = process.argv[2] === 'true'
authPrepper(encrypt)
