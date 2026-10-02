ack boundary diagram: client -> [intent journal] -> [apply: tmp+rename] -> [ack journal] -> client.
Crash left of apply: nothing applied, safe retry. Crash between apply and ack: applied once,
recovery replays idempotently, ack dedups. Crash right of ack: done. The ack journal is the
dedup key; the tmp+rename is the atomicity mechanism. Reviewed.