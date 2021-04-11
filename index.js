class Pipeflow {
  constructor() {
    this._middlewares = []
    this._error_middlewares = []
  }

  use(f) {
    const pipeline = this
    const isErrorAction = f => f.length === 3

    function run(err, args) {
      const cur_md = this

      const invokeAction = (args, next) => cur_md.action(args, next)
      const invokeErrorAction = (err, args, next) => cur_md.action(err, args, next)

      const runNext = (err, next_args) => {
        cur_md.was_run = true

        if (err) {
          const error_middlewares_to_run = pipeline._error_middlewares.filter(md => !md.was_run)

          if (error_middlewares_to_run.length === 0) {
            throw err
          }

          const first_error_middleware = error_middlewares_to_run[0]

          return first_error_middleware.run(err, next_args)
        }

        if (!cur_md.next) {
          return next_args
        }

        return cur_md.next.run(err, next_args)
      }

      return isErrorAction(cur_md.action) ? invokeErrorAction(err, args, runNext) : invokeAction(args, runNext)
    }

    const new_middleware = { action: f, next: null, was_run: false, run }

    const middlewares = (() => {
      if (isErrorAction(f)) {
        return this._error_middlewares
      }

      return this._middlewares
    })()

    if (middlewares.length > 0) {
      const last_middleware = middlewares[middlewares.length - 1]
      last_middleware.next = new_middleware
    }

    middlewares.push(new_middleware)

    return this
  }

  run(args) {
    if (this._middlewares.length === 0) {
      return args
    }

    const first_middleware = this._middlewares[0]

    return first_middleware.run(null, args)
  }
}

module.exports = Pipeflow
