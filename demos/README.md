# XR Blocks Demos Submission

Thank you creators for contributing to XR Blocks! We firmly believe
that with your contribution, we can inspire more hackers, designers, and
practitioners to unleash their creativity! Let's make AI + XR accessible to
everyone so they may bring their ideas to life faster.

For basic demo to demonstrate the use of a particular module, we suggest you
submit to `/samples/`.

## Contributing a New Demo

### Step 1: Clone this repository and sign contributor agreement

Fork this repository and clone the forked repo to your laptop or workstation.
Review and sign the
[Contributor Licence Agreement](https://cla.developers.google.com/about) (CLA).
Now you are ready to create a pull request :)

### Step 2: Create your sample

Follow README.md in the root folder to set up your development workflow. Create
a new sample by starting from scratch or an existing template from `/templates/`
or `/samples/`.

When using third-party assets, make sure they are compatible with Apache 2
license and add corresponding LICENSE file to the demo folder. Please submit large assets as a PR to https://github.com/xrblocks/proprietary-assets and use a jsdelivr CDN link to reference them.

For samples with third-party npm dependencies or requiring a build, please configure a `package.json` using `pnpm` and add your project to the `build_all.sh` script. See `drone` for an example.

### Step 3: Create a pull request

Now that your files are created and configured correctly, commit and create a
pull request by following
[the official GitHub guide](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request).

## Community Guidelines

This project follows [Google's Open Source Community Guidelines](https://opensource.google/conduct/).
