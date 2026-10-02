#!/bin/bash
echo "dev server root:"; curl -s -o /dev/null -w "%{http_code}\n" --max-time 10 http://localhost:3100/ || echo CURL_FAIL
echo "happy-place:"; curl -s -o /dev/null -w "%{http_code}\n" --max-time 10 http://localhost:3100/sites/happy-place || echo CURL_FAIL
echo "sites index:"; curl -s -o /dev/null -w "%{http_code}\n" --max-time 10 http://localhost:3100/sites || echo CURL_FAIL
