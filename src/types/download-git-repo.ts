declare module "download-git-repo" {
  type Repo =
    | string
    | { type: string; origin: string; name: string; checkout: string };

  function download(
    repo: Repo,
    dest: string,
    options: { clone?: boolean },
    callback: (err?: Error) => void
  ): void;

  export default download;
}
