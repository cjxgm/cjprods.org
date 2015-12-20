'use strict';

// manipulator :: tree -> (tree -> tree) `manipulate` -> tree
// smanipulator :: tree `root` -> tree `sub` -> tree

define(() => {
    var manips = [];

    var register = (stage, name, manipulator) => {
        if (manips[stage] == null) manips[stage] = {};
        manips[stage][name] = manipulator;
    };

    var append = (name, manipulator) => {
        var stage = {};
        stage[name] = manipulator;
        manips.push(stage);
    };

    var manip_stage = (tree, stage) =>
        (stage[tree.name] || (x => x))(tree, manipulate);

    var manip_tree = tree =>
        manips.reduce((tree, stage) => manip_stage(tree, stage), tree);

    var manip_forest = forest =>
        forest.map(tree => manip_tree(tree));

    var manipulate = tree =>
        (tree instanceof Array ? manip_forest : manip_tree)(tree);

    var simple = (subtree_key, smanipulator) =>
        (tree, manipulate) => (
            sub => sub instanceof Array
                ? sub.map(t => smanipulator(tree, t))
                : smanipulator(tree, sub)
        )(manipulate(tree[subtree_key]));

    return { register, append, manipulate, simple };
});

