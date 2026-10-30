// STORY-180: the dispatch check of sign-release.yml, run as written. Given a name, when the check's own lines run in
// bash, then only qgs-<v>.zip, qgs-release-list-<v>.json and qgs-channel-<v>.json pass, and the bill of materials is
// taken for a zip only. Run: node --test tests/name-check.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const yml = readFileSync(new URL('../.github/workflows/sign-release.yml', import.meta.url), 'utf8').split(/\r?\n/)
const at = yml.findIndex((l) => l.trim() === '- name: Check the dispatch')
const run = yml.findIndex((l, i) => i > at && l.trim() === 'run: |')
const check = []
for (let i = run + 1; i < yml.length && !/^\s*(jq |- name:)/.test(yml[i]); i++) check.push(yml[i].trim())

const SHA = 'a'.repeat(64)
const passes = (NAME, SBOM = '') => spawnSync('bash', ['-c', check.join('\n')], { env: { ...process.env, NAME, SHA, SBOM }, encoding: 'utf8' }).status === 0

test('the check was read from the workflow (three lines, the name check first)', () => {
  assert.equal(check.length, 3)
  assert.match(check[0], /NAME/)
})

test('KNOWN-BAD STORY-180: the channel statement qgs-channel-<v>.json is signed', () => {
  assert.equal(passes('qgs-channel-3.1.74.json'), true)
})

test('the release zip and release list still pass; the bill of materials goes with a zip only', () => {
  assert.equal(passes('qgs-3.1.74.zip'), true)
  assert.equal(passes('qgs-3.1.74.zip', SHA), true)
  assert.equal(passes('qgs-release-list-3.1.74.json'), true)
  assert.equal(passes('qgs-channel-3.1.74.json', SHA), false)
})

test('any other name is refused', () => {
  for (const n of ['qgs-channel-3.1.json', 'qgs-channel-3.1.74.json.zip', 'channel-3.1.74.json', 'qgs-channel-v3.1.74.json', 'qgs-other-3.1.74.json', '../qgs-3.1.74.zip', 'qgs-3.1.74.zip\nx', '']) {
    assert.equal(passes(n), false, n)
  }
})
