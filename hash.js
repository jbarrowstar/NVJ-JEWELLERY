const bcrypt = require('bcrypt');

const password = 'asdf@1234';

bcrypt.hash(password, 10).then(hash => {
  console.log('🔐 Hashed password:', hash);
});
