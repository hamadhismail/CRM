const { isIP } = require('node:net');

function isPostgresLoopbackAddress(value) {
  if (typeof value !== 'string' || value.length === 0) return false;

  const slash = value.lastIndexOf('/');
  const address = slash === -1 ? value : value.slice(0, slash);
  const prefix = slash === -1 ? undefined : value.slice(slash + 1);
  const version = isIP(address);
  if (version === 0) return false;
  if (prefix !== undefined) {
    if (!/^\d+$/.test(prefix)) return false;
    const expectedPrefix = version === 4 ? '32' : '128';
    if (prefix !== expectedPrefix) return false;
  }

  if (version === 4) return address.startsWith('127.');
  if (address.toLowerCase() === '::1') return true;

  const mappedIpv4 = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i)?.[1];
  return mappedIpv4 !== undefined
    && isIP(mappedIpv4) === 4
    && mappedIpv4.startsWith('127.');
}

module.exports = { isPostgresLoopbackAddress };
