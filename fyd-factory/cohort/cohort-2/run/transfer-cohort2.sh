#!/bin/bash
# transfer-cohort2.sh: ship cohort-2 raw corpus + runner to the Pig, run, fetch back.
# Usage: ./transfer-cohort2.sh [up|run|down|all]
set -u
cd "$(dirname "$0")/.."
SSH="ssh -F /home/hatch/.ssh/pig-config"
SCP="scp -F /home/hatch/.ssh/pig-config"
PIGRUN="$SSH pigwsl"

do_up() {
  tar czf scratch/cohort2-raw.tar.gz -C . raw/
  ls -la scratch/cohort2-raw.tar.gz
  $PIGRUN 'wsl -- mkdir -p /mnt/c/Users/nolan/transfer'
  $SCP scratch/cohort2-raw.tar.gz 'pigwsl:C:/Users/nolan/transfer/cohort2-raw.tar.gz'
  $SCP run/sites2.json 'pigwsl:C:/Users/nolan/transfer/cohort2-sites.json'
  $SCP run/cohort2-run.mts 'pigwsl:C:/Users/nolan/transfer/cohort2-run.mts'
  $SCP run/run-cohort2-pig.sh 'pigwsl:C:/Users/nolan/transfer/run-cohort2-pig.sh'
  $SCP run/stage-cohort2.sh 'pigwsl:C:/Users/nolan/transfer/stage-cohort2.sh'
  $PIGRUN 'wsl -- bash /mnt/c/Users/nolan/transfer/stage-cohort2.sh'
  echo UP-DONE
}

do_run() {
  OBSERVED=$(date -u +%FT%TZ)
  echo "observed_at=$OBSERVED"
  $PIGRUN "wsl -- bash /home/nolan/run-cohort2-pig.sh $OBSERVED"
  echo RUN-DONE
}

do_down() {
  $PIGRUN 'wsl -- bash -c "cd /home/nolan/cohort2-out && tar czf /mnt/c/Users/nolan/transfer/cohort2-out.tar.gz ."'
  $SCP 'pigwsl:C:/Users/nolan/transfer/cohort2-out.tar.gz' scratch/cohort2-out.tar.gz
  $PIGRUN 'wsl -- bash -c "rm /mnt/c/Users/nolan/transfer/cohort2-out.tar.gz"'
  mkdir -p acquisitions
  tar xzf scratch/cohort2-out.tar.gz -C acquisitions/
  ls acquisitions/
  echo DOWN-DONE
}

case "${1:-all}" in
  up) do_up;; run) do_run;; down) do_down;;
  all) do_up; do_run; do_down;;
esac
