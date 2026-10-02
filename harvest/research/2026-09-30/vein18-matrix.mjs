import { isPublicIp } from "/tmp/vein18/safe-fetch.ts";

// Hostile matrix for the 2026-09-30 vein-18 gate closure.
// isPublicIp is executed from a READ-ONLY copy of
// /home/nolan/projects/ping/src/fyd/net/safe-fetch.ts at HEAD ed3ff708
// (branch fyd/builder-harvest-trackc-2026-09-28), imported verbatim.

const rejectCases = [
  ["::1", "v6 loopback"],
  ["0:0:0:0:0:0:0:1", "v6 loopback expanded spelling"],
  ["::", "v6 unspecified"],
  ["fe80::1", "v6 link-local"],
  ["64:ff9b::7f00:1", "NAT64 embedding 127.0.0.1"],
  ["64:FF9B::7F00:1", "NAT64 uppercase spelling"],
  ["64:ff9b::a9fe:a9fe", "NAT64 embedding 169.254.169.254"],
  ["64:ff9b::c0a8:1", "NAT64 embedding 192.168.0.1"],
  ["2002:7f00:1::", "6to4 embedding 127.0.0.1"],
  ["2002:ac10::", "6to4 embedding 172.16.0.0"],
  ["::ffff:127.0.0.1", "v4-mapped dotted"],
  ["::ffff:10.0.0.1", "v4-mapped dotted RFC1918"],
  ["0:0:0:0:0:ffff:7f00:1", "v4-mapped uncompressed hex"],
  ["::7f00:1", "v4-compat spelling"],
  ["0:0:0:0:0:0:127.0.0.1", "v4-compat dotted uncompressed"],
  ["0:0:0:0:ffff:0:7f00:1", "SIIT translatable ::ffff:0:0/96"],
  ["2606:4700:4700:1234:0:5efe:7f00:1", "ISATAP loopback under public prefix"],
  ["::ffff:1:2:3", "mapped-adjacent unassigned"],
  ["2001::1", "Teredo"],
  ["2001:db8::1", "documentation range"],
  ["2001:2::1", "benchmarking range"],
  ["127.0.0.1", "v4 loopback"],
  ["10.1.2.3", "v4 RFC1918"],
  ["169.254.169.254", "v4 metadata endpoint"],
  ["100.64.0.1", "v4 CGNAT"],
];

const acceptCases = [
  ["93.184.216.34", "public v4"],
  ["8.8.8.8", "public v4"],
  ["2606:4700:4700::1111", "public v6"],
  ["64:ff9b::5db8:d822", "NAT64 embedding 93.184.216.34 (public)"],
  ["::ffff:93.184.216.34", "v4-mapped embedding public v4"],
  ["2002:5db8:d822::", "6to4 embedding 93.184.216.34 (public)"],
];

let fails = 0;
const run = (cases, expected) => {
  for (const [ip, label] of cases) {
    let got;
    try {
      got = isPublicIp(ip);
    } catch (e) {
      got = "THREW:" + String(e && e.message ? e.message : e);
    }
    const ok = got === expected;
    if (!ok) fails += 1;
    console.log(
      (ok ? "PASS" : "FAIL") +
        " expect=" + (expected ? "accept" : "reject") +
        " got=" + String(got) +
        " ip=" + ip +
        " // " + label
    );
  }
};
run(rejectCases, false);
run(acceptCases, true);
console.log("matrix failures: " + fails);
process.exit(fails === 0 ? 0 : 1);
