import Link from "next/link";

import { Article, DERNIERE_MISE_A_JOUR, Encadre, Section } from "@/app/(legal)/texte";

export const metadata = { title: "Conditions d'utilisation" };

export default function PageConditions() {
  return (
    <Article titre="Conditions d'utilisation" date={DERNIERE_MISE_A_JOUR}>
      <Encadre>
        En ouvrant un compte, vous allez enregistrer des informations sur
        d&apos;autres personnes. Ces conditions portent surtout là-dessus : ce
        que vous vous engagez à faire vis-à-vis d&apos;elles.
      </Encadre>

      <Section titre="À quoi sert Harvest">
        <p>
          Harvest sert à tenir le suivi de personnes rencontrées lors de
          l&apos;évangélisation : les recontacter, planifier des visites, garder
          la trace des échanges. C&apos;est son seul objet.
        </p>
      </Section>

      <Section titre="Votre responsabilité envers les personnes que vous enregistrez">
        <p>
          Chaque dossier que vous créez porte le nom, le numéro et la position
          religieuse d&apos;une personne réelle qui n&apos;a pas de compte ici et
          ne verra jamais ce que vous écrivez. Vous en êtes responsable.
        </p>
        <p>Vous vous engagez à :</p>
        <ul>
          <li>
            <strong>informer la personne</strong> que vous conservez ses
            coordonnées pour la recontacter, avant de les enregistrer. La case à
            cocher prévue à la création sert à cela ; nous n&apos;avons aucun
            moyen de vérifier que vous l&apos;avez fait, et c&apos;est
            précisément pourquoi elle vous engage ;
          </li>
          <li>
            <strong>supprimer son dossier si elle le demande</strong>, sans
            discuter et sans délai ;
          </li>
          <li>
            <strong>n&apos;écrire dans les notes que ce qui sert le suivi.</strong>{" "}
            Ni santé, ni situation familiale, ni opinion politique, ni difficulté
            financière, ni quoi que ce soit qui pourrait nuire à cette personne
            si le carnet tombait entre d&apos;autres mains ;
          </li>
          <li>
            <strong>ne pas enregistrer de mineur</strong> sans l&apos;accord de
            ses parents ou de son tuteur.
          </li>
        </ul>
      </Section>

      <Section titre="Ce qui est interdit, sans exception">
        <ul>
          <li>
            <strong>Vendre, louer, céder ou publier</strong> les données
            contenues dans Harvest, en totalité ou en partie.
          </li>
          <li>
            <strong>Les employer à autre chose que le suivi</strong> :
            démarchage commercial, campagne politique, recrutement, constitution
            d&apos;un fichier revendu ou partagé ailleurs.
          </li>
          <li>
            <strong>Enregistrer quelqu&apos;un pour lui nuire</strong>, le
            surveiller, ou tenir une liste de personnes à raison de leurs
            croyances dans un autre but que celui du suivi qu&apos;elles ont
            accepté.
          </li>
          <li>
            Extraire massivement le contenu de la base, par script ou autrement.
          </li>
          <li>
            Partager votre compte, ou vous connecter avec celui de quelqu&apos;un
            d&apos;autre.
          </li>
        </ul>
        <p>
          Un manquement entraîne la fermeture définitive du compte, sans
          préavis, et peut exposer à des poursuites : détourner un fichier de
          données personnelles est une infraction dans la plupart des pays, pas
          seulement une violation de ces conditions.
        </p>
      </Section>

      <Section titre="Votre compte">
        <p>
          Vous êtes responsable de votre mot de passe et de ce qui se fait avec
          votre compte. Si vous perdez un appareil, déconnectez-le : la liste de
          vos sessions permet de le faire à distance.
        </p>
        <p>
          Vous pouvez fermer votre compte quand vous le voulez. Fermer un compte
          supprime les dossiers qu&apos;il contient — ils n&apos;ont pas de
          raison de survivre à celui qui les tenait.
        </p>
      </Section>

      <Section titre="Le service tel qu'il est">
        <p>
          Harvest est un logiciel libre publié sous licence AGPL-3.0, fourni en
          l&apos;état et sans garantie. Il peut connaître des interruptions.
          C&apos;est un outil de suivi, pas un coffre-fort : gardez vos propres
          traces de ce qui compte pour vous.
        </p>
        <p>
          Le code est consultable et modifiable par tous. Si vous en exploitez
          une version modifiée comme service, la licence vous oblige à en publier
          les sources.
        </p>
      </Section>

      <Section titre="Ces conditions peuvent changer">
        <p>
          En cas de modification touchant vos obligations envers les personnes
          suivies, vous en serez averti dans l&apos;application avant que la
          nouvelle version s&apos;applique.
        </p>
      </Section>

      <Section titre="Nous écrire">
        <p>
          Éditeur du service : <strong>Franck Niat</strong>, Douala, Cameroun.
        </p>
        <p>
          Contact :{" "}
          <a
            href="mailto:franckniato7@gmail.com"
            className="text-primary hover:underline"
          >
            franckniato7@gmail.com
          </a>
          .
        </p>
        <p>
          Le traitement des données est décrit dans la{" "}
          <Link href="/confidentialite" className="text-primary hover:underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </Section>

      <Encadre variante="avertissement">
        Ce document décrit fidèlement le fonctionnement du logiciel et les
        engagements attendus, mais il n&apos;a pas été relu par un juriste. Avant
        une mise en service ouverte au public, il doit l&apos;être au regard du
        droit applicable là où le service est exploité.
      </Encadre>
    </Article>
  );
}
