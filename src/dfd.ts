
interface resolvable<T> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (value: T | PromiseLike<T>) => void;
  promise: Promise<T>;
}

export function makeDfd<T>() {
  const dfd: resolvable<T> = {} as any;
  dfd.promise = new Promise<T>((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
}