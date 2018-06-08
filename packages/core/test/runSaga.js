import test from 'tape'

import { runSaga, stdChannel } from '../src'
import { fork, take, put, select, all } from '../src/effects'

function storeLike(reducer, state) {
  const channel = stdChannel()
  const channelPut = channel.put
  const dispatch = action => {
    state = reducer(state, action)
    channelPut(action)
    return action
  }
  channel.put = dispatch

  return {
    channel,
    dispatch,
    getState: () => state,
  }
}

test('runSaga', assert => {
  assert.plan(1)

  let actual = []
  function reducer(state, action) {
    return action
  }
  const store = storeLike(reducer, {})
  const typeSelector = a => a.type
  const task = runSaga(store, root)

  function* root() {
    yield all([fork(fnA), fork(fnB)])
  }

  function* fnA() {
    actual.push(yield take('ACTION-1'))
    actual.push(yield select(typeSelector))
    actual.push(yield take('ACTION-2'))
    actual.push(yield select(typeSelector))
    yield put({ type: 'ACTION-3' })
  }

  function* fnB() {
    actual.push(yield take('ACTION-3'))
    actual.push(yield select(typeSelector))
  }

  Promise.resolve()
    .then(() => store.dispatch({ type: 'ACTION-1' }))
    .then(() => store.dispatch({ type: 'ACTION-2' }))

  const expected = [
    { type: 'ACTION-1' },
    'ACTION-1',
    { type: 'ACTION-2' },
    'ACTION-2',
    { type: 'ACTION-3' },
    'ACTION-3',
  ]

  task
    .toPromise()
    .then(() => {
      assert.deepEqual(actual, expected, 'runSaga must connect the provided iterator to the store, and run it')
    })
    .catch(err => assert.fail(err))
})
