
Laboratoire pratique d'orchestration Docker 
===========================================

Dans cet atelier, vous allez jouer avec les fonctionnalités
d'orchestration de conteneurs de Docker. Vous déploierez une application
simple sur un seul hôte et apprendrez comment cela fonctionne. Ensuite,
vous configurerez le mode Docker Swarm et apprendrez à déployer la même
application simple sur plusieurs hôtes. Vous verrez ensuite comment
mettre à l'échelle l'application et déplacer facilement la charge de
travail entre différents hôtes.

> **Difficulté** : débutant

> **Durée** : environ 30 minutes

> **Tâches** :
>
> -   [Section \# 1 - Qu'est-ce que l'orchestration](#basics)
> -   [Section \# 2 - Configurer le mode Swarm](#start-cluster)
> -   [Section \# 3 - Déployer des applications sur plusieurs hôtes](#multi-application)
> -   [Section \# 4 - Mettre à l'échelle l'application](#scale-application)
> -   [Section \# 5 - Vider un nœud et replanifier les conteneurs](#recover-application)
> -   [Nettoyer](#cleanup)

Section 1: Qu'est-ce que l'orchestration
========================================

Alors, qu'est-ce que l'orchestration de toute façon? Eh bien, l'orchestration est probablement mieux décrite à l'aide d'un exemple.
Supposons que vous ayez une application qui a un trafic élevé et des exigences de haute disponibilité. En raison de ces exigences, vous souhaitez généralement déployer sur au moins 3 machines ou plus, de sorte qu'en cas de défaillance d'un hôte, votre application sera toujours accessible à partir d'au moins deux autres. Évidemment, ce n'est qu'un exemple et votre cas d'utilisation aura probablement ses propres exigences, mais vous voyez l'idée.

Le déploiement de votre application sans orchestration prend généralement beaucoup de temps et est source d'erreurs, car vous devrez SSH manuellement sur chaque machine, démarrer votre application, puis garder continuellement un œil sur les choses pour vous assurer qu'il fonctionne comme prévu.

Mais, avec les outils d'orchestration, vous pouvez généralement décharger une grande partie de ce travail manuel et laisser l'automatisation faire le gros du travail. Une fonctionnalité intéressante d'Orchestration avec Docker Swarm est que vous pouvez déployer une application sur de nombreux hôtes avec une seule commande (une fois le mode Swarm activé). De plus, si l'un des nœuds de support meurt dans votre Docker Swarm, les autres nœuds prendront automatiquement la charge et votre application continuera à bourdonner comme d'habitude.

Si vous n'utilisez généralement que `docker run` pour déployer vos applications, vous pourriez probablement vraiment bénéficier de l'utilisation de Docker Compose, du mode Docker Swarm ou à la fois de Docker Compose et Swarm.

Section 2: Configurer le mode Swarm 
===================================

Les applications du monde réel sont généralement déployées sur plusieurs hôtes, comme indiqué précédemment. Cela améliore les performances et la disponibilité des applications, tout en permettant aux composants d'application individuels de s'adapter indépendamment. Docker dispose de puissants outils natifs pour vous aider à le faire. 

Un exemple d'exécution manuelle et sur un seul hôte serait de créer un nouveau conteneur sur **node1** en exécutant `docker run -dt mtbsoft/myipaddress`.

    docker run -dt mtbsoft/myipaddress sleep infinity

``` {.highlight}
Unable to find image 'mtbsoft/myipaddress:latest' locally
latest: Pulling from mtbsoft/myipaddress
d54efb8db41d: Pull complete
f8b845f45a87: Pull complete
e8db7bf7c39f: Pull complete
9654c40e9079: Pull complete
6d9ef359eaaa: Pull complete
Digest: sha256:dd7808d8792c9841d0b460122f1acf0a2dd1f56404f8d1e56298048885e45535
Status: Downloaded newer image for mtbsoft/myipaddress:latest
846af8479944d406843c90a39cba68373c619d1feaa932719260a5f5afddbf71
```

Cette commande créera un nouveau conteneur basé sur l'`mtbsoft/myipaddress:latest` image. Vous pouvez vérifier que notre exemple de conteneur est opérationnel en s'exécutant `docker ps`sur **node1** .

    docker ps

``` {.highlight}
CONTAINER ID        IMAGE                             COMMAND             CREATED             STATUS              PORTS                             NAMES
044bea1c2277        mtbsoft/myipaddress              "sleep infinity"    2 seconds ago       Up 1 second                             distracted_mayer
```

Mais, ce n'est que sur un seul nœud. Que se passe-t-il si ce nœud tombe en panne? Eh bien, notre application meurt et elle n'est jamais redémarrée. Pour restaurer le service, nous devions nous connecter manuellement à cette machine et commencer à peaufiner les choses pour la remettre en marche. Ainsi, il serait utile que nous disposions d'un type de système qui nous permettrait d'exécuter cette application / service «en veille» sur de nombreuses machines.

Dans cette section, vous allez configurer le *mode Swarm* . Il s'agit d'un nouveau mode facultatif dans lequel plusieurs hôtes Docker forment un groupe auto-orchestré de moteurs appelé *essaim* . Le mode Swarm active de nouvelles fonctionnalités telles que des *services* et des *offres groupées* qui vous aident à déployer et à gérer des applications multi-conteneurs sur plusieurs hôtes Docker.

Vous effectuerez les opérations suivantes:

-   Configurer le *mode Swarm*
-   Exécutez l'application
-   Faites évoluer l'application
-   Vider les nœuds pour la maintenance et replanifier les conteneurs

Pour le reste de ce laboratoire , nous appellerons *Docker regroupement natif* comme le ***mode Swarm*** . L'ensemble des moteurs Docker configurés pour le mode Swarm sera appelé l' *essaim* . 

Un essaim comprend un ou plusieurs *nœuds de gestion* et un ou plusieurs *nœuds de travail* . Les nœuds de gestion maintiennent l'état de l'essaim et planifient les conteneurs d'applications. Les nœuds worker exécutent les conteneurs d'application. Depuis Docker 1.12, aucun backend externe, ni aucun composant tiers, n'est requis pour un essaim entièrement fonctionnel - tout est intégré!

Dans cette partie de la démo, vous utiliserez les trois nœuds de votre laboratoire. **node1** sera le gestionnaire Swarm, tandis que **node2** et **node3** seront des nœuds worker. Le mode Swarm prend en charge les nœuds de gestionnaire redondants hautement disponibles, mais pour les besoins de cet atelier, vous ne déploierez qu'un seul nœud de gestionnaire.

Étape 2.1 - Créer un nœud de gestionnaire 
-----------------------------------------

Dans cette étape, vous allez initialiser un nouveau Swarm, rejoindre un seul nœud worker et vérifier les opérations effectuées.

Exécutez `docker swarm init` sur **node1** .

    docker swarm init --advertise-addr $(hostname -i)

``` {.highlight}
Swarm initialized: current node (6dlewb50pj2y66q4zi3egnwbi) is now   manager.

To add a worker to this swarm, run the following command:

    docker swarm join \
    --token SWMTKN-1-1wxyoueqgpcrc4xk2t3ec7n1poy75g4kowmwz64p7ulqx611ih-68pazn0mj8p4p4lnuf4ctp8xy \
    10.0.0.5:2377

To add a manager to this swarm, run 'docker swarm join-token manager' and follow the instructions.
```

Vous pouvez exécuter la `docker info` commande pour vérifier que **node1 a** été correctement configuré en tant que nœud de gestionnaire de swarm.

    docker info

``` {.highlight}
Containers: 2
 Running: 0
 Paused: 0
 Stopped: 2
Images: 2
Server Version: 17.03.1-ee-3
Storage Driver: aufs
 Root Dir: /var/lib/docker/aufs
 Backing Filesystem: extfs
 Dirs: 13
 Dirperm1 Supported: true
Logging Driver: json-file
Cgroup Driver: cgroupfs
Plugins:
 Volume: local
 Network: bridge host macvlan null overlay
Swarm: active
 NodeID: rwezvezez3bg1kqg0y0f4ju22
 Is Manager: true
 ClusterID: qccn5eanox0uctyj6xtfvesy2
 Managers: 1
 Nodes: 1
 Orchestration:
  Task History Retention Limit: 5
 Raft:
  Snapshot Interval: 10000
  Number of Old Snapshots to Retain: 0
  Heartbeat Tick: 1
  Election Tick: 3
 Dispatcher:
  Heartbeat Period: 5 seconds
 CA Configuration:
  Expiry Duration: 3 months
 Node Address: 10.0.0.5
 Manager Addresses:
  10.0.0.5:2377
<Snip>
```

Le swarm est maintenant initialisé avec **node1** comme seul nœud Manager. Dans la section suivante, vous allez ajouter **node2** et **node3 en** tant que *nœuds Worker* .

Étape 2.2 - Joindre les nœuds Worker à l'essaim
-----------------------------------------------

Vous effectuez la procédure suivante sur **node2** et **node3** . Vers la fin de la procédure, vous reviendrez au **node1** .

Maintenant, prenez la `docker swarm join ...` commande entière que nous avons copiée précédemment à partir de l' `node1` endroit où elle était affichée en tant que sortie du terminal. Nous devons coller la commande copiée dans le terminal de **node2** et **node3** .

Cela devrait ressembler à quelque chose comme ça pour **node2** . À propos, si la `docker swarm join ...` commande a déjà défilé hors de votre écran, vous pouvez exécuter la `docker swarm join-token worker` commande sur le nœud Manager pour la récupérer.

> N'oubliez pas que les jetons affichés ici ne sont pas les jetons réels que vous utiliserez. 
> Copiez la commande de la sortie sur **node1** .
> Sur **node2** et **node3,** cela devrait ressembler à ceci:

``` {.highlight}
docker swarm join \
    --token SWMTKN-1-1wxyoueqgpcrc4xk2t3ec7n1poy75g4kowmwz64p7ulqx611ih-68pazn0mj8p4p4lnuf4ctp8xy \
    10.0.0.5:2377
```

``` {.highlight}
docker swarm join \
    --token SWMTKN-1-1wxyoueqgpcrc4xk2t3ec7n1poy75g4kowmwz64p7ulqx611ih-68pazn0mj8p4p4lnuf4ctp8xy \
    10.0.0.5:2377
```

Une fois que vous avez exécuté ceci sur **node2** et **node3** , revenez à **node1** et exécutez a `docker node ls` pour vérifier que les deux nœuds font partie de Swarm. Vous devriez voir trois nœuds, **node1** comme nœud Manager et **node2** et **node3** tous deux comme nœuds Worker.

    docker node ls

``` {.highlight}
ID                           HOSTNAME  STATUS  AVAILABILITY  MANAGER STATUS
6dlewb50pj2y66q4zi3egnwbi *  node1   Ready   Active        Leader
ym6sdzrcm08s6ohqmjx9mk3dv    node3   Ready   Active
yu3hbegvwsdpy9esh9t2lr431    node2   Ready   Active
```

La `docker node ls`{.language-plaintext .highlighter-rouge}commande vous montre tous les nœuds qui sont dans l'essaim ainsi que leurs rôles dans l'essaim. Le `*`{.language-plaintext .highlighter-rouge}identifie le nœud à partir duquel vous exécutez la commande.

Toutes nos félicitations! Vous avez configuré un essaim avec un nœud de gestionnaire et deux nœuds de travail.

Section 3: déployer des applications sur plusieurs hôtes 
========================================================

Maintenant que vous avez un essaim opérationnel, il est temps de déployer notre application de sommeil vraiment simple.

Vous exécuterez la procédure suivante à partir de **node1** .

Étape 3.1 - Déployer les composants de l'application en tant que services Docker 
--------------------------------------------------------------------------------

Notre `myipaddress` application devient très populaire sur Internet (en raison de la frappe de Reddit et HN).
Les gens adorent ça. Vous allez donc devoir faire évoluer votre application pour répondre aux pics de demande. Vous devrez également le faire sur plusieurs hôtes pour une haute disponibilité. Nous utiliserons le concept de *services* pour faire évoluer notre application facilement et gérer de nombreux conteneurs en une seule entité.

> *Les services* étaient un nouveau concept dans Docker 1.12. Ils fonctionnent avec des essaims et sont destinés aux conteneurs de longue durée.

Vous exécuterez cette procédure à partir de **node1** .

Déployons-nous en `myipaddress` tant que *service* sur notre Docker Swarm.

    docker service create --name myipaddress mtbsoft/myipaddress sleep infinity

``` {.highlight}
of5rxsxsmm3asx53dqcq0o29c
```

Vérifiez que le `service create` a bien été reçu par le gestionnaire Swarm.

    docker service ls

``` {.highlight}
ID            NAME       MODE        REPLICAS  IMAGE
of5rxsxsmm3a  myipaddress  replicated  1/1       mtbsoft/myipaddress:latest
```

L'état du service peut changer plusieurs fois jusqu'à ce qu'il soit en cours d'exécution. L'image est en cours de téléchargement depuis Docker Store vers les autres moteurs du Swarm. Une fois l'image téléchargée, le conteneur passe en état d'exécution sur l'un des trois nœuds.

À ce stade, il peut ne pas sembler que nous ayons fait quelque chose de très différent de la simple exécution d'un fichier `docker run ...`. Nous avons de nouveau déployé un seul conteneur sur un seul hôte. La différence ici est que le conteneur a été planifié sur un cluster d'essaim.

Bien joué. Vous avez déployé l'application sleep sur votre nouveau Swarm à l'aide des services Docker.

Section 4: Mettre à l'échelle l'application
===========================================

La demande est folle! Tout le monde aime votre `myipaddress` application! Il est temps de se développer.

L'un des avantages des *services* est que vous pouvez les augmenter et les réduire pour répondre à la demande. Dans cette étape, vous augmenterez puis redescendrez le service.

Vous exécuterez la procédure suivante à partir de **node1** .

Mettez à l'échelle le nombre de conteneurs dans le service **myipaddress** à 7 avec la `docker service update --replicas 7 myipaddress` commande. `replicas` est le terme que nous utilisons pour décrire des conteneurs identiques offrant le même service.

    docker service update --replicas 7 myipaddress

Le gestionnaire Swarm planifie de sorte qu'il y ait 7 `myipaddress` conteneurs dans le cluster. Celles-ci seront planifiées de manière uniforme entre les membres de Swarm.

Nous allons utiliser la `docker service ps myipaddress` commande. Si vous faites cela assez rapidement après avoir utilisé l' `--replicas` option, vous pouvez voir les conteneurs apparaître en temps réel.

    docker service ps myipaddress

``` {.highlight}
ID            NAME         IMAGE          NODE     DESIRED STATE  CURRENT STATE          ERROR  PORTS
7k0flfh2wpt1  myipaddress.1  mtbsoft/myipaddress:latest  node1  Running        Running 9 minutes ago
wol6bzq7xf0v  myipaddress.2  mtbsoft/myipaddress:latest  node3  Running        Running 2 minutes ago
id50tzzk1qbm  myipaddress.3  mtbsoft/myipaddress:latest  node2  Running        Running 2 minutes ago
ozj2itmio16q  myipaddress.4  mtbsoft/myipaddress:latest  node3  Running        Running 2 minutes ago
o4rk5aiely2o  myipaddress.5  mtbsoft/myipaddress:latest  node2  Running        Running 2 minutes ago
35t0eamu0rue  myipaddress.6  mtbsoft/myipaddress:latest  node2  Running        Running 2 minutes ago
44s8d59vr4a8  myipaddress.7  mtbsoft/myipaddress:latest  node1  Running        Running 2 minutes ago
```

Notez qu'il y a maintenant 7 conteneurs répertoriés. Cela peut prendre quelques secondes pour que les nouveaux conteneurs du service s'affichent tous comme **EN COURS D'EXÉCUTION** . La `NODE` colonne nous indique sur quel nœud un conteneur s'exécute.

Redimensionnez le service à seulement quatre conteneurs avec la `docker service update --replicas 4 myipaddress` commande.

    docker service update --replicas 4 myipaddress

Vérifiez que le nombre de conteneurs a été réduit à 4 à l'aide de la `docker service ps myipaddress` commande.

    docker service ps myipaddress

``` {.highlight}
ID            NAME         IMAGE          NODE     DESIRED STATE  CURRENT STATE           ERROR  PORTS
7k0flfh2wpt1  myipaddress.1  mtbsoft/myipaddress:latest  node1  Running        Running 13 minutes ago
wol6bzq7xf0v  myipaddress.2  mtbsoft/myipaddress:latest  node3  Running        Running 5 minutes ago
35t0eamu0rue  myipaddress.6  mtbsoft/myipaddress:latest  node2  Running        Running 5 minutes ago
44s8d59vr4a8  myipaddress.7  mtbsoft/myipaddress:latest  node1  Running        Running 5 minutes ago
```

Vous avez réussi à augmenter et réduire un service swarm.

Section 5: Vider un nœud et replanifier les conteneurs
======================================================

Votre application de sommeil a fait un travail incroyable après avoir frappé Reddit et HN. Il est désormais numéro 1 sur l'App Store! Vous avez augmenté pendant les vacances et vers le bas pendant la basse saison. Maintenant que vous effectuez une maintenance sur l'un de vos serveurs, vous devrez retirer un serveur de l'essaim sans interrompre le service à vos clients.

Regardez à nouveau l'état de vos nœuds en exécutant
`docker node ls` sur **node1** .

    docker node ls

``` {.highlight}
ID                           HOSTNAME  STATUS  AVAILABILITY  MANAGER STATUS
6dlewb50pj2y66q4zi3egnwbi *  node1   Ready   Active        Leader
ym6sdzrcm08s6ohqmjx9mk3dv    node3   Ready   Active
yu3hbegvwsdpy9esh9t2lr431    node2   Ready   Active
```

Vous allez mettre le **node2** hors service pour maintenance.

Voyons les conteneurs que vous exécutez sur **node2** .

    docker ps

``` {.highlight}
CONTAINER ID        IMAGE                                                                            COMMAND             CREATED             STATUS              PORTS               NAMES
4e7ea1154ea4        mtbsoft/myipaddress@sha256:dd7808d8792c9841d0b460122f1acf0a2dd1f56404f8d1e56298048885e45535   "sleep infinity"    9 minutes ago       Up 9 minutes                            myipaddress.6.35t0eamu0rueeozz0pj2xaesi
```

Vous pouvez voir que nous avons l'un des conteneurs slepp-app en cours d'exécution ici (votre sortie peut cependant sembler différente).

Revenons maintenant à **node1** (le gestionnaire Swarm) et **mettons** le **node2** hors service. Pour ce faire, `docker node ls` recommençons.

    docker node ls

``` {.highlight}
ID                           HOSTNAME  STATUS  AVAILABILITY  MANAGER STATUS
6dlewb50pj2y66q4zi3egnwbi *  node1   Ready   Active        Leader
ym6sdzrcm08s6ohqmjx9mk3dv    node3   Ready   Active
yu3hbegvwsdpy9esh9t2lr431    node2   Ready   Active
```

Nous allons prendre l' **ID** de **node2** et exécuter
`docker node update --availability drain yournodeid` . Nous utilisons l' **ID d'** hôte **node2** comme entrée dans notre commande. Remplacez yournodeid par l'id de **node2** .****`drain`****

``` {.highlight}
docker node update --availability drain yournodeid
```

Vérifiez l'état des nœuds

    docker node ls

``` {.highlight}
ID                           HOSTNAME  STATUS  AVAILABILITY  MANAGER STATUS
6dlewb50pj2y66q4zi3egnwbi *  node1   Ready   Active        Leader
ym6sdzrcm08s6ohqmjx9mk3dv    node3   Ready   Active
yu3hbegvwsdpy9esh9t2lr431    node2   Ready   Drain
```

Le nœud **node2** est maintenant dans l' `Drain` état.

Revenez à **node2** et voyez ce qui y est en cours d'exécution `docker ps`.

    docker ps

``` {.highlight}
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
```

**node2** n'a aucun conteneur en cours d'exécution.

Enfin, vérifiez à nouveau le service sur **node1** pour vous assurer que le conteneur a été replanifié. Vous devriez voir les quatre conteneurs s'exécuter sur les deux nœuds restants.

    docker service ps myipaddress

``` {.highlight}
ID            NAME             IMAGE          NODE     DESIRED STATE  CURRENT STATE           ERROR  PORTS
7k0flfh2wpt1  myipaddress.1      mtbsoft/myipaddress:latest  node1  Running        Running 25 minutes ago
wol6bzq7xf0v  myipaddress.2      mtbsoft/myipaddress:latest  node3  Running        Running 18 minutes ago
s3548wki7rlk  myipaddress.6      mtbsoft/myipaddress:latest  node3  Running        Running 3 minutes ago
35t0eamu0rue   \_ myipaddress.6  mtbsoft/myipaddress:latest  node2  Shutdown       Shutdown 3 minutes ago
44s8d59vr4a8  myipaddress.7      mtbsoft/myipaddress:latest  node1  Running        Running 18 minutes ago
```

Nettoyer 
========

Exécutez la `docker service rm myipaddress` commande sur **node1** pour supprimer le service appelé *myservice* .

    docker service rm myipaddress

Exécutez la `docker ps` commande sur **node1** pour obtenir une liste des conteneurs en cours d'exécution.

    docker ps

``` {.highlight}
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
044bea1c2277        mtbsoft/myipaddress              "sleep infinity"    17 minutes ago      17 minutes ag                           distracted_mayer
```

Vous pouvez utiliser la `docker kill <CONTAINER ID>` commande sur **node1** pour tuer le conteneur de sommeil que nous avons commencé au début.

``` {.highlight}
docker kill yourcontainerid
```

Enfin, supprimons node1, node2 et node3 du Swarm. Nous pouvons utiliser la `docker swarm leave --force` commande pour faire cela.

Permet de courir `docker swarm leave --force` sur **node1** .

    docker swarm leave --force

Ensuite, exécutez `docker swarm leave --force` sur **node2** .

    docker swarm leave --force

Enfin, exécutez `docker swarm leave --force` sur **node3** .

    docker swarm leave --force

Toutes nos félicitations! Vous avez terminé ce laboratoire. Vous savez maintenant comment créer un essaim, déployer des applications sous forme de collections de services et faire évoluer les services individuels de haut en bas.
